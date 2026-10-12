import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DetectedTextRegion, FittedRect } from '../types';
import { colors } from '../theme';

interface Props {
  regions: DetectedTextRegion[];
  selected: Set<string>;
  fit: FittedRect;
  interactive: boolean;
  onToggle: (id: string) => void;
}

/**
 * Renders OCR text regions as selectable boxes, positioned in the fitted image
 * coordinate space. Only identification is automatic; the user explicitly taps a
 * region to mark it as a watermark candidate.
 */
export default function TextSelectionOverlay({
  regions,
  selected,
  fit,
  interactive,
  onToggle,
}: Props) {
  return (
    <View pointerEvents={interactive ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      {regions.map((region) => {
        const isSelected = selected.has(region.id);
        const box = {
          left: fit.x + region.box.x * fit.scale,
          top: fit.y + region.box.y * fit.scale,
          width: region.box.width * fit.scale,
          height: region.box.height * fit.scale,
        };
        return (
          <Pressable
            key={region.id}
            onPress={() => onToggle(region.id)}
            style={[
              styles.box,
              box,
              isSelected ? styles.selected : styles.unselected,
            ]}
          >
            {isSelected && (
              <Text style={styles.label} numberOfLines={1}>
                {region.text}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'flex-start',
  },
  selected: {
    borderColor: colors.maskStroke,
    backgroundColor: colors.maskFill,
  },
  unselected: {
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  label: {
    color: colors.onAccent,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 3,
    paddingVertical: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
