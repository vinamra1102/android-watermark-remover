import {
  aspectFit,
  clamp,
  clampToImage,
  drawnRect,
  imageToScreen,
  normalizedToImage,
  screenToImage,
  screenToNormalized,
} from '../src/utils/coordinates';
import type { Point, Size, ViewTransform } from '../src/types';

const identity: ViewTransform = { zoom: 1, panX: 0, panY: 0 };

function close(a: Point, b: Point): void {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
}

describe('aspectFit', () => {
  it('letterboxes a wide image', () => {
    const fit = aspectFit({ width: 1000, height: 500 }, { width: 400, height: 400 });
    expect(fit).toEqual({ x: 0, y: 100, width: 400, height: 200, scale: 0.4 });
  });

  it('letterboxes a tall image', () => {
    const fit = aspectFit({ width: 500, height: 1000 }, { width: 400, height: 400 });
    expect(fit).toEqual({ x: 100, y: 0, width: 200, height: 400, scale: 0.4 });
  });

  it('upscales a small image to fill the viewport', () => {
    const fit = aspectFit({ width: 200, height: 200 }, { width: 400, height: 400 });
    expect(fit).toEqual({ x: 0, y: 0, width: 400, height: 400, scale: 2 });
  });

  it('rejects non-positive dimensions', () => {
    expect(() => aspectFit({ width: 0, height: 10 }, { width: 100, height: 100 })).toThrow();
    expect(() => aspectFit({ width: 10, height: 10 }, { width: 0, height: 100 })).toThrow();
  });
});

describe('screenToImage / imageToScreen', () => {
  const image: Size = { width: 1000, height: 500 };
  const viewport: Size = { width: 400, height: 400 };

  it('maps the viewport center to the image center at identity transform', () => {
    close(screenToImage({ x: 200, y: 200 }, image, viewport, identity), { x: 500, y: 250 });
  });

  it('keeps the center invariant under zoom', () => {
    const zoomed: ViewTransform = { zoom: 2, panX: 0, panY: 0 };
    close(screenToImage({ x: 200, y: 200 }, image, viewport, zoomed), { x: 500, y: 250 });
  });

  it('shifts the mapping under pan', () => {
    const panned: ViewTransform = { zoom: 2, panX: 40, panY: -20 };
    close(screenToImage({ x: 200, y: 200 }, image, viewport, panned), { x: 450, y: 275 });
  });

  it('round-trips through imageToScreen', () => {
    const panned: ViewTransform = { zoom: 1.75, panX: -12, panY: 33 };
    const screen: Point = { x: 137, y: 291 };
    const imagePoint = screenToImage(screen, image, viewport, panned);
    close(imageToScreen(imagePoint, image, viewport, panned), screen);
  });
});

describe('screenToNormalized / normalizedToImage', () => {
  const image: Size = { width: 800, height: 400 };
  const viewport: Size = { width: 400, height: 400 };

  it('maps center screen to normalized center', () => {
    close(screenToNormalized({ x: 200, y: 200 }, image, viewport, identity), { x: 0.5, y: 0.5 });
  });

  it('converts normalized back to image pixels', () => {
    close(normalizedToImage({ x: 0.25, y: 0.75 }, image), { x: 200, y: 300 });
  });
});

describe('clamp helpers', () => {
  it('clamps numeric values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('clamps points to image bounds', () => {
    const image: Size = { width: 100, height: 50 };
    close(clampToImage({ x: -5, y: 60 }, image), { x: 0, y: 50 });
  });
});

describe('drawnRect', () => {
  it('accounts for zoom and pan around the fit center', () => {
    const image: Size = { width: 1000, height: 500 };
    const viewport: Size = { width: 400, height: 400 };
    const rect = drawnRect(image, viewport, { zoom: 2, panX: 40, panY: -20 });
    expect(rect).toEqual({ x: -160, y: -20, width: 800, height: 400 });
  });
});
