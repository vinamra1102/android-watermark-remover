import { NativeModules } from 'react-native';
import type { DetectedTextResult, ProcessingResult, RemoveTextRequest, Size } from '../types';

/**
 * Typed interface over the Kotlin `WatermarkModule` native module.
 *
 * All heavy work runs on a native background executor; the bridge only carries
 * content URIs and metadata (normalized strokes, rectangles, parameters), never
 * full-resolution pixel arrays or base64 blobs.
 */
interface NativeWatermarkRemover {
  /** Launch the Android Photo Picker and return the selected content URI. */
  pickImage(): Promise<string>;
  /** Return the orientation-corrected pixel dimensions of an image URI. */
  getImageInfo(uri: string): Promise<Size>;
  /** Run bundled on-device OCR and return detected text regions. */
  detectText(inputUri: string): Promise<DetectedTextResult>;
  /** Remove the masked regions with OpenCV inpainting; returns an output URI. */
  removeText(request: RemoveTextRequest): Promise<ProcessingResult>;
  /** Copy a processed image into the system gallery via MediaStore (no permission on API 29+). */
  exportImage(uri: string): Promise<void>;
  /** Cancel an in-progress processing operation if one is supported. */
  cancelProcessing(): Promise<void>;
}

const native = NativeModules.WatermarkRemover as NativeWatermarkRemover | undefined;

function requireNative(): NativeWatermarkRemover {
  if (!native) {
    throw new Error(
      'WatermarkRemover native module is not available. Make sure the Kotlin package is registered and the app was rebuilt.',
    );
  }
  return native;
}

export const WatermarkRemover = {
  isAvailable: Boolean(native),

  pickImage(): Promise<string> {
    return requireNative().pickImage();
  },

  getImageInfo(uri: string): Promise<Size> {
    return requireNative().getImageInfo(uri);
  },

  detectText(inputUri: string): Promise<DetectedTextResult> {
    return requireNative().detectText(inputUri);
  },

  removeText(request: RemoveTextRequest): Promise<ProcessingResult> {
    return requireNative().removeText(request);
  },

  exportImage(uri: string): Promise<void> {
    return requireNative().exportImage(uri);
  },

  cancelProcessing(): Promise<void> {
    return requireNative().cancelProcessing();
  },
};
