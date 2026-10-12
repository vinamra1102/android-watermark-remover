import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import BeforeAfter from '../components/BeforeAfter';
import BrushOverlay from '../components/BrushOverlay';
import ExportSheet from '../components/ExportSheet';
import ImageCanvas from '../components/ImageCanvas';
import Slider from '../components/Slider';
import TextSelectionOverlay from '../components/TextSelectionOverlay';
import { WatermarkRemover } from '../native/WatermarkRemover';
import { colors, radius, spacing } from '../theme';
import type {
  BrushStroke,
  DetectedTextResult,
  FittedRect,
  ProcessingResult,
  Size,
  ViewTransform,
} from '../types';
import { aspectFit, clamp, screenToNormalized } from '../utils/coordinates';
import {
  beginStroke,
  canRedo,
  canUndo,
  clearStrokes,
  createMaskState,
  extendStroke,
  redo,
  undo,
  type MaskState,
} from '../utils/mask';

type Tool = 'pan' | 'brush' | 'erase';

interface Props {
  imageUri: string;
  onBack: () => void;
}

let strokeIdCounter = 0;
function nextStrokeId(): string {
  strokeIdCounter += 1;
  return `stroke-${Date.now()}-${strokeIdCounter}`;
}

interface BrushContext {
  imageSize: Size | null;
  viewportSize: Size | null;
  fit: FittedRect | null;
  brushSizePx: number;
  tool: Tool;
}

export default function EditorScreen({ imageUri, onBack }: Props) {
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [viewportSize, setViewportSize] = useState<Size | null>(null);
  const [tool, setTool] = useState<Tool>('pan');
  const [brushSizePx, setBrushSizePx] = useState(16);
  const [mask, setMask] = useState<MaskState>(createMaskState());
  const [detected, setDetected] = useState<DetectedTextResult | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [detecting, setDetecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit');
  const [exportVisible, setExportVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zoom = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startPanX = useSharedValue(0);
  const startPanY = useSharedValue(0);
  const transformRef = useRef<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const activeStrokeId = useRef<string | null>(null);

  const fit = useMemo<FittedRect | null>(() => {
    if (!imageSize || !viewportSize) {
      return null;
    }
    return aspectFit(imageSize, viewportSize);
  }, [imageSize, viewportSize]);

  const stateRef = useRef<BrushContext>({
    imageSize: null,
    viewportSize: null,
    fit: null,
    brushSizePx: 16,
    tool: 'pan',
  });
  stateRef.current = { imageSize, viewportSize, fit, brushSizePx, tool };

  useEffect(() => {
    let active = true;
    WatermarkRemover.getImageInfo(imageUri)
      .then((size) => {
        if (active) {
          setImageSize(size);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : 'Unable to read image dimensions');
        }
      });
    return () => {
      active = false;
    };
  }, [imageUri]);

  const syncTransform = useCallback((z: number, x: number, y: number) => {
    transformRef.current = { zoom: z, panX: x, panY: y };
  }, []);

  const handleStrokeBegin = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    if (!s.imageSize || !s.viewportSize || !s.fit) {
      return;
    }
    const norm = screenToNormalized({ x, y }, s.imageSize, s.viewportSize, transformRef.current);
    const radius = s.brushSizePx / (s.fit.width * transformRef.current.zoom);
    const id = nextStrokeId();
    activeStrokeId.current = id;
    const stroke: BrushStroke = {
      type: 'stroke',
      id,
      mode: s.tool === 'erase' ? 'erase' : 'brush',
      radius,
      points: [{ x: clamp(norm.x, 0, 1), y: clamp(norm.y, 0, 1) }],
    };
    setMask((prev) => beginStroke(prev, stroke));
  }, []);

  const handleStrokeMove = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    const id = activeStrokeId.current;
    if (!s.imageSize || !s.viewportSize || !id) {
      return;
    }
    const norm = screenToNormalized({ x, y }, s.imageSize, s.viewportSize, transformRef.current);
    setMask((prev) =>
      extendStroke(prev, id, { x: clamp(norm.x, 0, 1), y: clamp(norm.y, 0, 1) }),
    );
  }, []);

  const handleStrokeEnd = useCallback(() => {
    activeStrokeId.current = null;
  }, []);

  const composed = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        startZoom.value = zoom.value;
      })
      .onUpdate((e) => {
        const next = Math.min(6, Math.max(1, startZoom.value * e.scale));
        zoom.value = next;
        runOnJS(syncTransform)(next, translateX.value, translateY.value);
      });

    const navPan = Gesture.Pan()
      .enabled(tool === 'pan')
      .onStart(() => {
        startPanX.value = translateX.value;
        startPanY.value = translateY.value;
      })
      .onUpdate((e) => {
        translateX.value = startPanX.value + e.translationX;
        translateY.value = startPanY.value + e.translationY;
        runOnJS(syncTransform)(zoom.value, translateX.value, translateY.value);
      });

    const brushPan = Gesture.Pan()
      .enabled(tool === 'brush' || tool === 'erase')
      .onBegin((e) => {
        runOnJS(handleStrokeBegin)(e.x, e.y);
      })
      .onUpdate((e) => {
        runOnJS(handleStrokeMove)(e.x, e.y);
      })
      .onEnd(() => {
        runOnJS(handleStrokeEnd)();
      });

    return Gesture.Simultaneous(pinch, navPan, brushPan);
  }, [
    tool,
    zoom,
    translateX,
    translateY,
    startZoom,
    startPanX,
    startPanY,
    syncTransform,
    handleStrokeBegin,
    handleStrokeMove,
    handleStrokeEnd,
  ]);

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewportSize({ width, height });
  };

  const handleDetect = async () => {
    setDetecting(true);
    setError(null);
    try {
      const res = await WatermarkRemover.detectText(imageUri);
      setDetected(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Text detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedRectangles = useMemo(() => {
    if (!detected) {
      return [];
    }
    return detected.regions.filter((r) => selectedRegions.has(r.id)).map((r) => r.box);
  }, [detected, selectedRegions]);

  const hasSelection = mask.present.length > 0 || selectedRectangles.length > 0;

  const handleRemoveText = async () => {
    if (!hasSelection) {
      setError('Select text to remove first: brush over it or tap a detected region.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const res = await WatermarkRemover.removeText({
        inputUri: imageUri,
        strokes: mask.present,
        rectangles: selectedRectangles,
        inpaintRadius: 3,
        maskExpandPixels: 2,
      });
      setResult(res);
      setViewMode('compare');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    WatermarkRemover.cancelProcessing().catch(() => {});
  };

  const handleBack = () => {
    if (processing) {
      handleCancel();
    }
    onBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} hitSlop={8}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Editor</Text>
        <Pressable
          onPress={handleDetect}
          disabled={detecting || processing}
          style={[styles.detectButton, (detecting || processing) && styles.disabled]}
        >
          {detecting ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Text style={styles.detectText}>Detect Text</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.canvas} onLayout={onViewportLayout}>
        {viewMode === 'compare' && result ? (
          <BeforeAfter beforeUri={imageUri} afterUri={result.outputUri} />
        ) : (
          <GestureDetector gesture={composed}>
            <View style={StyleSheet.absoluteFill} collapsable={false}>
              <ImageCanvas
                imageUri={imageUri}
                zoom={zoom}
                translateX={translateX}
                translateY={translateY}
              >
                {fit && (
                  <>
                    <BrushOverlay strokes={mask.present} fit={fit} />
                    {detected && (
                      <TextSelectionOverlay
                        regions={detected.regions}
                        selected={selectedRegions}
                        fit={fit}
                        interactive={tool === 'pan' && !processing}
                        onToggle={toggleRegion}
                      />
                    )}
                  </>
                )}
              </ImageCanvas>
            </View>
          </GestureDetector>
        )}

        {processing && (
          <View style={styles.progressOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.progressText}>Removing text…</Text>
            <Pressable onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.controls}>
        <View style={styles.toolRow}>
          {(['pan', 'brush', 'erase'] as Tool[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTool(t)}
              style={[styles.toolButton, tool === t && styles.toolButtonActive]}
              disabled={processing}
            >
              <Text style={[styles.toolText, tool === t && styles.toolTextActive]}>
                {t === 'pan' ? 'Pan' : t === 'brush' ? 'Brush' : 'Erase'}
              </Text>
            </Pressable>
          ))}
        </View>

        {(tool === 'brush' || tool === 'erase') && (
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Size</Text>
            <View style={styles.slider}>
              <Slider min={4} max={48} value={brushSizePx} onChange={setBrushSizePx} />
            </View>
            <Text style={styles.sliderValue}>{Math.round(brushSizePx)}</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setMask((prev) => undo(prev))}
            disabled={!canUndo(mask) || processing}
            style={[styles.iconButton, (!canUndo(mask) || processing) && styles.disabled]}
          >
            <Text style={styles.iconText}>Undo</Text>
          </Pressable>
          <Pressable
            onPress={() => setMask((prev) => redo(prev))}
            disabled={!canRedo(mask) || processing}
            style={[styles.iconButton, (!canRedo(mask) || processing) && styles.disabled]}
          >
            <Text style={styles.iconText}>Redo</Text>
          </Pressable>
          <Pressable
            onPress={() => setMask((prev) => clearStrokes(prev))}
            disabled={mask.present.length === 0 || processing}
            style={[styles.iconButton, (mask.present.length === 0 || processing) && styles.disabled]}
          >
            <Text style={styles.iconText}>Clear</Text>
          </Pressable>
        </View>

        <View style={styles.primaryRow}>
          {result && (
            <Pressable
              onPress={() => setViewMode((m) => (m === 'edit' ? 'compare' : 'edit'))}
              style={[styles.secondaryButton, processing && styles.disabled]}
              disabled={processing}
            >
              <Text style={styles.secondaryText}>
                {viewMode === 'compare' ? 'Edit Again' : 'Compare'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleRemoveText}
            disabled={!hasSelection || processing}
            style={[styles.removeButton, (!hasSelection || processing) && styles.disabled]}
          >
            <Text style={styles.removeText}>Remove Text</Text>
          </Pressable>
        </View>

        {result && viewMode === 'compare' && (
          <Pressable onPress={() => setExportVisible(true)} style={styles.exportButton}>
            <Text style={styles.exportText}>Save Image</Text>
          </Pressable>
        )}
      </View>

      <ExportSheet
        visible={exportVisible}
        outputUri={result?.outputUri ?? null}
        onClose={() => setExportVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontSize: 16,
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  detectButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detectText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: colors.textPrimary,
    fontSize: 15,
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  controls: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  toolRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  toolButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: colors.surfaceElevated,
  },
  toolButtonActive: {
    backgroundColor: colors.accent,
  },
  toolText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  toolTextActive: {
    color: colors.onAccent,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    width: 36,
  },
  slider: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  sliderValue: {
    color: colors.textPrimary,
    fontSize: 13,
    width: 28,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: colors.surfaceElevated,
  },
  iconText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryRow: {
    flexDirection: 'row',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  removeButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  removeText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  exportButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.success,
  },
  exportText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});
