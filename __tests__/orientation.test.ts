import { decodeOrientation, transformedDimensions } from '../src/utils/orientation';

describe('decodeOrientation', () => {
  it('handles all eight EXIF orientation values', () => {
    expect(decodeOrientation(1)).toEqual({ rotationDegrees: 0, flipHorizontal: false });
    expect(decodeOrientation(2)).toEqual({ rotationDegrees: 0, flipHorizontal: true });
    expect(decodeOrientation(3)).toEqual({ rotationDegrees: 180, flipHorizontal: false });
    expect(decodeOrientation(4)).toEqual({ rotationDegrees: 180, flipHorizontal: true });
    expect(decodeOrientation(5)).toEqual({ rotationDegrees: 270, flipHorizontal: true });
    expect(decodeOrientation(6)).toEqual({ rotationDegrees: 90, flipHorizontal: false });
    expect(decodeOrientation(7)).toEqual({ rotationDegrees: 90, flipHorizontal: true });
    expect(decodeOrientation(8)).toEqual({ rotationDegrees: 270, flipHorizontal: false });
  });

  it('defaults unknown or missing values to identity', () => {
    expect(decodeOrientation(0)).toEqual({ rotationDegrees: 0, flipHorizontal: false });
    expect(decodeOrientation(9)).toEqual({ rotationDegrees: 0, flipHorizontal: false });
  });
});

describe('transformedDimensions', () => {
  it('swaps width and height for 90/270 rotations', () => {
    const rot90 = decodeOrientation(6);
    const rot270 = decodeOrientation(8);
    expect(transformedDimensions(1920, 1080, rot90)).toEqual({ width: 1080, height: 1920 });
    expect(transformedDimensions(1920, 1080, rot270)).toEqual({ width: 1080, height: 1920 });
  });

  it('keeps dimensions for 0/180 rotations and flips', () => {
    const normal = decodeOrientation(1);
    const rot180 = decodeOrientation(3);
    expect(transformedDimensions(1920, 1080, normal)).toEqual({ width: 1920, height: 1080 });
    expect(transformedDimensions(1920, 1080, rot180)).toEqual({ width: 1920, height: 1080 });
  });
});
