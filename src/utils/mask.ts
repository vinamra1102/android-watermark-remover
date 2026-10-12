import type { BrushStroke, Rect, StrokePoint } from '../types';

/**
 * Undo/redo history for the manual brush mask.
 *
 * `past` and `future` are stacks of full stroke-array snapshots. `present` is the
 * current list of strokes. Stroke extension (mid-drag) never creates a history
 * entry; beginning a stroke and clearing do.
 */
export interface MaskState {
  past: BrushStroke[][];
  present: BrushStroke[];
  future: BrushStroke[][];
}

export function createMaskState(): MaskState {
  return { past: [], present: [], future: [] };
}

/** Begin a new stroke: snapshot the current state and append the stroke. */
export function beginStroke(state: MaskState, stroke: BrushStroke): MaskState {
  return {
    past: [...state.past, state.present],
    present: [...state.present, stroke],
    future: [],
  };
}

/** Append a point to an in-progress stroke without creating a history entry. */
export function extendStroke(state: MaskState, strokeId: string, point: StrokePoint): MaskState {
  return {
    ...state,
    present: state.present.map((s) =>
      s.id === strokeId ? { ...s, points: [...s.points, point] } : s,
    ),
  };
}

/** Remove a completed stroke (used by the eraser as an alternative path). */
export function removeStroke(state: MaskState, strokeId: string): MaskState {
  const next = state.present.filter((s) => s.id !== strokeId);
  if (next.length === state.present.length) {
    return state;
  }
  return { past: [...state.past, state.present], present: next, future: [] };
}

/** Clear every stroke. */
export function clearStrokes(state: MaskState): MaskState {
  if (state.present.length === 0) {
    return state;
  }
  return { past: [...state.past, state.present], present: [], future: [] };
}

export function undo(state: MaskState): MaskState {
  if (state.past.length === 0) {
    return state;
  }
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redo(state: MaskState): MaskState {
  if (state.future.length === 0) {
    return state;
  }
  const [next, ...rest] = state.future;
  return {
    past: [...state.past, state.present],
    present: next,
    future: rest,
  };
}

export function canUndo(state: MaskState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: MaskState): boolean {
  return state.future.length > 0;
}

/**
 * Rasterize the combined selection into a single-channel binary mask.
 *
 * Polarity: white (255) = reconstruct, black (0) = preserve.
 * Rectangles are filled first (OCR selections), then brush strokes are applied in
 * order so that erasing a stroke can trim a rectangle or earlier brush mark.
 */
export function rasterizeMask(
  strokes: BrushStroke[],
  rectangles: Rect[],
  width: number,
  height: number,
): Uint8Array {
  if (width <= 0 || height <= 0) {
    throw new Error(`rasterizeMask: invalid mask size ${width}x${height}`);
  }
  const mask = new Uint8Array(width * height); // starts black (preserve)

  for (const rect of rectangles) {
    fillRect(mask, width, height, rect, 255);
  }
  for (const stroke of strokes) {
    const value = stroke.mode === 'brush' ? 255 : 0;
    const radius = Math.max(0, stroke.radius * width);
    for (let i = 0; i < stroke.points.length; i += 1) {
      const p = stroke.points[i];
      stampCircle(mask, width, height, p.x * width, p.y * height, radius, value);
      if (i > 0) {
        const prev = stroke.points[i - 1];
        stampSegment(
          mask,
          width,
          height,
          prev.x * width,
          prev.y * height,
          p.x * width,
          p.y * height,
          radius,
          value,
        );
      }
    }
  }
  return mask;
}

/**
 * Binary dilation with a 3x3 (8-neighborhood) structuring element. White pixels
 * expand into neighboring black pixels. Used as a reference for the native
 * `MaskProcessor` (which uses OpenCV) so mask-expansion semantics can be tested.
 */
export function dilate(mask: Uint8Array, width: number, height: number, iterations = 1): Uint8Array {
  let src = mask;
  for (let it = 0; it < iterations; it += 1) {
    const dst = new Uint8Array(src);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (src[y * width + x] === 255) {
          continue;
        }
        let whiteNeighbor = false;
        for (let dy = -1; dy <= 1 && !whiteNeighbor; dy += 1) {
          for (let dx = -1; dx <= 1 && !whiteNeighbor; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && src[ny * width + nx] === 255) {
              whiteNeighbor = true;
            }
          }
        }
        if (whiteNeighbor) {
          dst[y * width + x] = 255;
        }
      }
    }
    src = dst;
  }
  return src;
}

function fillRect(mask: Uint8Array, width: number, height: number, rect: Rect, value: number): void {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(width - 1, Math.ceil(rect.x + rect.width) - 1);
  const y1 = Math.min(height - 1, Math.ceil(rect.y + rect.height) - 1);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      mask[y * width + x] = value;
    }
  }
}

function stampCircle(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  value: number,
): void {
  const r = Math.max(0, radius);
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        mask[y * width + x] = value;
      }
    }
  }
}

function stampSegment(
  mask: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  value: number,
): void {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / Math.max(0.5, radius * 0.5)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    stampCircle(mask, width, height, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, value);
  }
}
