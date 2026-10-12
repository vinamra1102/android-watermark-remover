/**
 * Shared types for the CleanText editor.
 *
 * Coordinate conventions:
 * - "screen" coordinates are device-independent points in the editor viewport.
 * - "image" coordinates are pixels in the original, orientation-corrected image.
 * - "normalized" coordinates are in the range [0, 1] relative to image width/height.
 *
 * Mask conventions:
 * - white (255) = region to reconstruct (selected text / brush).
 * - black (0)   = region to preserve.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FittedRect extends Rect {
  /** scale applied to fit the image inside the viewport (aspect-fit). */
  scale: number;
}

export interface ViewTransform {
  /** user zoom multiplier, >= 1. */
  zoom: number;
  /** pan offset in screen points. */
  panX: number;
  panY: number;
}

export type BrushMode = 'brush' | 'erase';

/** A single point of a brush stroke, in normalized image coordinates. */
export interface StrokePoint {
  x: number;
  y: number;
}

export interface BrushStroke {
  type: 'stroke';
  id: string;
  mode: BrushMode;
  /** brush radius, normalized to image width (fraction 0..1). */
  radius: number;
  points: StrokePoint[];
}

/** A rectangular OCR selection, in image pixel coordinates. */
export interface RectSelection {
  type: 'rect';
  id: string;
  rect: Rect;
}

export interface DetectedTextRegion {
  id: string;
  text: string;
  /** bounding box in image pixel coordinates. */
  box: Rect;
  confidence?: number;
}

export interface DetectedTextResult {
  width: number;
  height: number;
  regions: DetectedTextRegion[];
}

export interface RemoveTextRequest {
  inputUri: string;
  /** ordered manual brush strokes (brush = white, erase = black). */
  strokes: BrushStroke[];
  /** selected OCR rectangles, filled white before strokes are applied. */
  rectangles: Rect[];
  /** OpenCV Telea inpainting radius, in pixels. */
  inpaintRadius: number;
  /** how far to dilate the mask, in pixels, to cover antialiased edges. */
  maskExpandPixels: number;
}

export interface ProcessingResult {
  outputUri: string;
  width: number;
  height: number;
}
