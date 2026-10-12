package com.cleantext.watermark

import android.content.Context
import android.graphics.Rect
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * Runs bundled (offline) ML Kit Latin text recognition. The model ships inside the
 * APK, so no Google Play Services download or network access is required.
 */
object TextDetector {

    data class Region(val id: String, val text: String, val box: Rect)

    data class Result(val width: Int, val height: Int, val regions: List<Region>)

    fun detect(context: Context, uri: String): Result {
        val bitmap = ImageLoader.decode(context, uri, maxDim = 2000)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        return try {
            // Bitmap is already EXIF-corrected, so rotation is 0.
            val image = InputImage.fromBitmap(bitmap, 0)
            val text = Tasks.await(recognizer.process(image))

            val regions = mutableListOf<Region>()
            var id = 0
            for (block in text.textBlocks) {
                for (line in block.lines) {
                    val box = line.boundingBox ?: continue
                    val content = line.text ?: continue
                    if (content.isBlank()) {
                        continue
                    }
                    regions.add(Region("region-${id++}", content, box))
                }
            }
            Result(bitmap.width, bitmap.height, regions)
        } finally {
            recognizer.close()
            bitmap.recycle()
        }
    }
}
