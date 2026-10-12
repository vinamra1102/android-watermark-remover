package com.cleantext.watermark

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface

/**
 * Decodes content URIs into bitmaps with correct EXIF orientation and optional
 * downsampling for previews. Never mutates the original file.
 */
object ImageLoader {

    fun readOrientation(context: Context, uri: String): Int {
        return try {
            context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
                if (input == null) {
                    ExifInterface.ORIENTATION_NORMAL
                } else {
                    ExifInterface(input).getAttributeInt(
                        ExifInterface.TAG_ORIENTATION,
                        ExifInterface.ORIENTATION_NORMAL,
                    )
                }
            }
        } catch (_: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }
    }

    /** Returns orientation-corrected pixel dimensions without a full decode. */
    fun getDimensions(context: Context, uri: String): Pair<Int, Int> {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
            BitmapFactory.decodeStream(input, null, bounds)
        }
        val orientation = readOrientation(context, uri)
        return if (swapsDimensions(orientation)) {
            Pair(bounds.outHeight, bounds.outWidth)
        } else {
            Pair(bounds.outWidth, bounds.outHeight)
        }
    }

    fun decode(context: Context, uri: String, maxDim: Int? = null): Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
            BitmapFactory.decodeStream(input, null, bounds)
        }

        var sampleSize = 1
        if (maxDim != null && maxDim > 0) {
            val largest = maxOf(bounds.outWidth, bounds.outHeight)
            while (largest / (sampleSize * 2) >= maxDim) {
                sampleSize *= 2
            }
        }

        val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        val bitmap = context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
            BitmapFactory.decodeStream(input, null, options)
        } ?: throw IllegalStateException("Unable to decode image: $uri")

        val orientation = readOrientation(context, uri)
        return applyOrientation(bitmap, orientation)
    }

    fun applyOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
                matrix.setRotate(180f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.setRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.setRotate(-90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
            else -> return bitmap
        }
        val corrected = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        if (corrected !== bitmap) {
            bitmap.recycle()
        }
        return corrected
    }

    private fun swapsDimensions(orientation: Int): Boolean {
        return orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
            orientation == ExifInterface.ORIENTATION_ROTATE_270 ||
            orientation == ExifInterface.ORIENTATION_TRANSPOSE ||
            orientation == ExifInterface.ORIENTATION_TRANSVERSE
    }
}
