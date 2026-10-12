package com.cleantext.watermark

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream

/**
 * Encodes processed images into app-private cache and exports them to the gallery
 * via MediaStore (no broad storage permission needed on API 29+).
 */
object ImageExporter {

    fun encodeToCache(context: Context, bitmap: Bitmap, name: String): String {
        val file = File(context.cacheDir, name)
        FileOutputStream(file).use { out ->
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)) {
                throw IllegalStateException("Failed to encode image")
            }
        }
        return Uri.fromFile(file).toString()
    }

    fun exportToGallery(context: Context, uri: String) {
        val bitmap = ImageLoader.decode(context, uri, null)
        val resolver = context.contentResolver
        val name = "CleanText_${System.currentTimeMillis()}.jpg"
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, name)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                    put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/CleanText")
                }
                val collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                val item = resolver.insert(collection, values)
                    ?: throw IllegalStateException("Failed to create MediaStore entry")
                resolver.openOutputStream(item).use { out ->
                    if (out == null || !bitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)) {
                        throw IllegalStateException("Failed to write image")
                    }
                }
            } else {
                val url = MediaStore.Images.Media.insertImage(resolver, bitmap, name, "Processed by CleanText")
                if (url == null) {
                    throw IllegalStateException("Failed to export image")
                }
            }
        } finally {
            bitmap.recycle()
        }
    }
}
