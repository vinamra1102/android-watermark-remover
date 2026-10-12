package com.cleantext.watermark

import android.graphics.Bitmap
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.photo.Photo

/**
 * Applies OpenCV Telea inpainting. All Mats are released in `finally`; the caller
 * owns the input bitmap and the mask and must release them.
 */
object InpaintingEngine {

    @Volatile
    private var loaded = false

    private fun ensureLoaded() {
        if (!loaded) {
            synchronized(this) {
                if (!loaded) {
                    if (!OpenCVLoader.initLocal()) {
                        throw IllegalStateException("OpenCV native library failed to initialize")
                    }
                    loaded = true
                }
            }
        }
    }

    fun inpaint(bitmap: Bitmap, mask: Mat, radius: Double): Bitmap {
        ensureLoaded()
        require(bitmap.width == mask.cols() && bitmap.height == mask.rows()) {
            "Mask size (${mask.cols()}x${mask.rows()}) must match image (${bitmap.width}x${bitmap.height})"
        }

        val src = Mat()
        val dst = Mat()
        try {
            Utils.bitmapToMat(bitmap, src)
            Photo.inpaint(src, mask, dst, radius, Photo.INPAINT_TELEA)
            val result = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
            Utils.matToBitmap(dst, result)
            return result
        } finally {
            src.release()
            dst.release()
        }
    }
}
