import type { FittedRect, Point, Size, ViewTransform } from '../types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the aspect-fit ("contain") rect that renders `image` inside `viewport`,
 * centered with letterboxing. The image is never cropped and never distorts.
 */
export function aspectFit(image: Size, viewport: Size): FittedRect {
  if (image.width <= 0 || image.height <= 0) {
    throw new Error(`aspectFit: invalid image size ${image.width}x${image.height}`);
  }
  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error(`aspectFit: invalid viewport size ${viewport.width}x${viewport.height}`);
  }
  const scale = Math.min(viewport.width / image.width, viewport.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height,
    scale,
  };
}

export interface DrawnRect extends Size {
  x: number;
  y: number;
}

/**
 * The rectangle where the image is actually drawn after zoom and pan are applied.
 * Zoom scales around the fitted image center; pan is a plain screen-space offset.
 */
export function drawnRect(image: Size, viewport: Size, transform: ViewTransform): DrawnRect {
  const fit = aspectFit(image, viewport);
  const width = fit.width * transform.zoom;
  const height = fit.height * transform.zoom;
  return {
    x: fit.x + fit.width / 2 - width / 2 + transform.panX,
    y: fit.y + fit.height / 2 - height / 2 + transform.panY,
    width,
    height,
  };
}

/**
 * Map a viewport (screen) point to an original-image pixel coordinate,
 * accounting for aspect-fit padding, zoom, and pan.
 */
export function screenToImage(
  point: Point,
  image: Size,
  viewport: Size,
  transform: ViewTransform,
): Point {
  const drawn = drawnRect(image, viewport, transform);
  const nx = (point.x - drawn.x) / drawn.width;
  const ny = (point.y - drawn.y) / drawn.height;
  return { x: nx * image.width, y: ny * image.height };
}

/**
 * Inverse of `screenToImage`: map an original-image pixel coordinate to a
 * viewport (screen) point.
 */
export function imageToScreen(
  point: Point,
  image: Size,
  viewport: Size,
  transform: ViewTransform,
): Point {
  const drawn = drawnRect(image, viewport, transform);
  const nx = point.x / image.width;
  const ny = point.y / image.height;
  return { x: drawn.x + nx * drawn.width, y: drawn.y + ny * drawn.height };
}

/**
 * Map a viewport point to normalized image coordinates (0..1 in each axis).
 */
export function screenToNormalized(
  point: Point,
  image: Size,
  viewport: Size,
  transform: ViewTransform,
): Point {
  const img = screenToImage(point, image, viewport, transform);
  return { x: img.x / image.width, y: img.y / image.height };
}

/**
 * Map normalized image coordinates (0..1) to original-image pixel coordinates.
 */
export function normalizedToImage(point: Point, image: Size): Point {
  return { x: point.x * image.width, y: point.y * image.height };
}

/** Clamp an image-space point so it stays within the image bounds. */
export function clampToImage(point: Point, image: Size): Point {
  return {
    x: clamp(point.x, 0, image.width),
    y: clamp(point.y, 0, image.height),
  };
}
