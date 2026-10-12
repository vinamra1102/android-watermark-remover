# CleanText

CleanText is an **Android-first**, **completely offline** application that removes
unwanted text overlays (watermarks, captions, timestamps) from images. Detection,
mask editing, inpainting, and export all happen on the device — no server, no
account, no API key, and no network access is required for any core feature.

> **Honest note on capability:** CleanText uses *classical* image inpainting
> (OpenCV Telea). It reconstructs the background by diffusing neighboring pixels
> into the masked area. This works well on smooth regions (walls, skies, gradients)
> but **cannot reliably reconstruct arbitrary detail hidden behind large text** —
> fine textures, faces, and complex patterns will show visible artifacts. This is a
> fundamental limitation of classical inpainting, not a bug.

---

## Features

- Import images with the Android Photo Picker (no broad storage permission).
- On-device OCR (bundled ML Kit Latin model) to find text regions.
- Tap any detected line to select it as a candidate region.
- Manual brush and eraser for text the OCR misses, with adjustable size.
- Undo / redo / clear for the manual mask.
- Zoom and pan with precise screen↔image coordinate mapping.
- OpenCV Telea inpainting on a full-resolution, single-channel mask.
- Before/after comparison slider.
- Export to the gallery via MediaStore without overwriting the original.
- Single-threaded native executor keeps heavy work off the UI thread.
- All OpenCV `Mat` and bitmap allocations are released in `finally` blocks.

---

## Offline-first architecture

```
┌───────────────────────────── React Native (TypeScript) ─────────────────────────────┐
│  EditorScreen · ImageCanvas · BrushOverlay · TextSelectionOverlay                    │
│  BeforeAfter · ExportSheet · coordinates.ts · mask.ts · orientation.ts              │
└───────────────────────────────────────┬──────────────────────────────────────────────┘
                                        │  typed bridge (Promise-based, URIs + metadata)
┌───────────────────────────────────────▼──────────────────────────────────────────────┐
│                            Kotlin native module (background executor)               │
│  WatermarkModule ── pickImage / getImageInfo / detectText / removeText / export     │
│  ImageLoader (EXIF + decode) · TextDetector (ML Kit) · MaskProcessor (binary mask)  │
│  InpaintingEngine (OpenCV Telea) · ImageExporter (cache + MediaStore)               │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

The bridge carries **content URIs and normalized metadata** (brush strokes in
`0..1` image coordinates, rectangle boxes, processing parameters) — never
full-resolution pixel arrays or base64 blobs. The native `MaskProcessor` rasterizes
those normalized strokes at the *original* image resolution so the final mask aligns
with the source image regardless of screen zoom or letterboxing.

**Mask polarity:** white (`255`) = region to reconstruct, black (`0`) = region to
preserve. The mask is dilated by `maskExpandPixels` before inpainting to cover
antialiased text edges.

---

## Technology stack

| Layer | Technology |
| --- | --- |
| UI | React Native 0.74, TypeScript, React Native Gesture Handler, React Native Reanimated, react-native-svg |
| Native | Kotlin, React Native Native Modules (old architecture) |
| Vision | OpenCV 4.9 (Telea inpainting), ML Kit bundled Latin text recognition |
| Build | Gradle 8.6, Android Gradle Plugin 8.2.1, Kotlin 1.9.22 |

### Key dependencies (pinned)

- `org.opencv:opencv:4.9.0` — Android AAR from Maven Central, bundles native libs (min SDK 21).
- `com.google.mlkit:text-recognition:16.0.0` — **bundled** Latin model; no Play Services model download.
- `androidx.exifinterface:exifinterface:1.3.7` — EXIF orientation.
- `react-native` `0.74.5`, `react` `18.2.0`, `react-native-gesture-handler` `2.17.1`, `react-native-reanimated` `3.10.1`, `react-native-svg` `15.3.0`.

---

## Prerequisites

- **Node.js** 18+ (tested with 20+).
- **JDK 17** (required by AGP 8.2 / Gradle 8.6; newer JDKs such as 23/24 are **not** supported by this AGP version).
- **Android SDK**: `platforms;android-34`, `build-tools;34.0.0`.
- **Android Studio** (or `ANDROID_HOME` configured with the above SDK components).
- An Android device/emulator with Android 7.0 (API 24) or later.

---

## Installation

```bash
git clone https://github.com/vinamra1102/android-watermark-remover.git
cd android-watermark-remover
npm install
```

### OpenCV setup

OpenCV is pulled automatically from Maven Central (`org.opencv:opencv:4.9.0`) — no
manual SDK download is required. The AAR bundles the native `.so` libraries, and the
app loads them at first inpainting call via `OpenCVLoader.initLocal()`.

### Bundled OCR setup

The `text-recognition` ML Kit artifact ships the Latin model *inside* the APK
(~4 MB), so recognition works on first launch with airplane mode enabled. No
Google Play Services model download is used.

---

## Development

Start Metro:

```bash
npm start
```

Run on a connected device/emulator:

```bash
npm run android
```

Run the TypeScript type check:

```bash
npm run typecheck
```

Run the unit tests:

```bash
npm test
```

---

## Tests

Unit tests cover the pure logic and run under Jest on Node (no device needed):

```bash
npm test
```

Covered areas:

- Coordinate conversion between screen and source image (aspect-fit, zoom, pan, round-trips).
- Mask polarity (`white` = reconstruct, `black` = preserve) and stroke/rectangle rasterization.
- Binary mask dilation.
- Undo / redo history semantics.
- EXIF orientation decoding and dimension swapping.

Image fixtures for on-device/quality tests are not committed (they would be large
and require ownership/permission). Place owned test images in `test/fixtures/` and
refer to them from device-test scripts; they are git-ignored.

---

## Building a release APK

```bash
cd android
./gradlew assembleRelease
```

On Windows PowerShell, use `.\gradlew.bat assembleRelease`.

The unsigned APK is written to
`android/app/build/outputs/apk/release/app-release-unsigned.apk`. Configure a
signing key in `android/app/build.gradle` before distributing.

---

## Offline testing

To validate the offline-first requirement on a fresh install:

1. Put the device in **airplane mode**.
2. Install the app and launch it for the first time.
3. Import an image with the Photo Picker (this works without storage permission).
4. Run **Detect Text** and confirm OCR completes with no network.
5. Brush, erase, remove text, and export — all steps must work fully offline.

Confirm that no image, mask, metadata, or history ever leaves the device. The
`INTERNET` permission is present only for the Metro dev server in debug builds.

---

## Known limitations

- **Classical inpainting cannot reconstruct arbitrary content.** Large text over
  detailed textures, faces, or structured patterns will leave visible artifacts.
- **Latin script only** for the initial release. The `TextDetector` is structured so
  additional bundled recognizers (e.g. Chinese/Devanagari/Korean/Japanese) can be
  added later.
- OCR selection toggling is not part of the undo/redo stack (brush edits are).
- Cancellation is best-effort: a long OpenCV `inpaint` call cannot be interrupted
  mid-operation; the cancel flag prevents further work and rejects the pending promise.
- Very large images still decode a full-resolution bitmap for export; memory-aware
  tiling is a future optimization.
- Launcher icons are not included; the app uses the system default icon.

---

## Current implementation status

Implemented:

- React Native + TypeScript project scaffolding.
- Image import (Photo Picker) and preview with zoom/pan.
- EXIF-aware decoding and dimension reporting.
- Kotlin native bridge (`detectText`, `removeText`, `getImageInfo`, `pickImage`, `exportImage`, `cancelProcessing`).
- OpenCV Telea inpainting with mask dilation.
- Manual brush + eraser with undo/redo/clear and normalized coordinates.
- Bundled ML Kit Latin OCR with selectable line regions.
- Before/after comparison and gallery export.
- Jest unit tests for coordinates, mask, orientation, and history.

Not yet implemented / needs device validation:

- On-device build and runtime verification (see below).
- Additional bundled OCR scripts.
- Memory-aware tiling for very large images.
- App launcher icon.

### Build verification status

The complete source and Gradle configuration are provided, but a **successful
Android build was not verified in this development environment** because it lacks
the required toolchain (JDK 17 and the `platforms;android-34` / `build-tools;34.0.0`
SDK components). A build should be run on a machine with the prerequisites above
before treating the native code as verified.
