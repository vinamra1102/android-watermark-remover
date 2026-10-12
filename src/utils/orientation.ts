/**
 * EXIF orientation decoding.
 *
 * EXIF stores an integer tag describing how the image should be rotated/flipped
 * before display. This mapping is pure and shared conceptually with the Kotlin
 * `ImageLoader` (which uses `androidx.exifinterface` to read the tag, then the
 * same transform to correct it).
 */

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface OrientationTransform {
  rotationDegrees: RotationDegrees;
  flipHorizontal: boolean;
}

/**
 * Decode a raw EXIF orientation value into a rotation + horizontal-flip transform.
 * Values follow the EXIF 2.3 specification.
 */
export function decodeOrientation(orientation: number): OrientationTransform {
  switch (orientation) {
    case 1:
      return { rotationDegrees: 0, flipHorizontal: false };
    case 2:
      return { rotationDegrees: 0, flipHorizontal: true };
    case 3:
      return { rotationDegrees: 180, flipHorizontal: false };
    case 4:
      return { rotationDegrees: 180, flipHorizontal: true };
    case 5:
      return { rotationDegrees: 270, flipHorizontal: true };
    case 6:
      return { rotationDegrees: 90, flipHorizontal: false };
    case 7:
      return { rotationDegrees: 90, flipHorizontal: true };
    case 8:
      return { rotationDegrees: 270, flipHorizontal: false };
    default:
      return { rotationDegrees: 0, flipHorizontal: false };
  }
}

/** Whether the transform swaps width and height (i.e. rotates by 90/270). */
export function swapsDimensions(transform: OrientationTransform): boolean {
  return transform.rotationDegrees === 90 || transform.rotationDegrees === 270;
}

/**
 * Return the width/height after applying the orientation transform, without
 * allocating an actual image. Used so UI and mask math agree with the native
 * loader before any decoding happens.
 */
export function transformedDimensions(
  width: number,
  height: number,
  transform: OrientationTransform,
): { width: number; height: number } {
  return swapsDimensions(transform)
    ? { width: height, height: width }
    : { width, height };
}
