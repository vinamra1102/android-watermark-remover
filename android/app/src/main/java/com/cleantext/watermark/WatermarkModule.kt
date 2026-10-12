package com.cleantext.watermark

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.opencv.core.Rect
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicBoolean

class WatermarkModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var currentFuture: Future<*>? = null
    private val cancelled = AtomicBoolean(false)
    private var pickPromise: Promise? = null

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == PICK_IMAGE_REQUEST) {
                val promise = pickPromise ?: return
                pickPromise = null
                if (resultCode == Activity.RESULT_OK && data?.data != null) {
                    promise.resolve(data.data.toString())
                } else {
                    promise.reject("PICK_CANCELLED", "Image selection was cancelled")
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "WatermarkRemover"

    @ReactMethod
    fun pickImage(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available to pick an image")
            return
        }
        pickPromise = promise
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Intent(MediaStore.ACTION_PICK_IMAGES)
        } else {
            Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI).apply {
                type = "image/*"
            }
        }
        activity.startActivityForResult(intent, PICK_IMAGE_REQUEST)
    }

    @ReactMethod
    fun getImageInfo(uri: String, promise: Promise) {
        submit(promise) {
            val (width, height) = ImageLoader.getDimensions(reactContext, uri)
            Arguments.createMap().apply {
                putInt("width", width)
                putInt("height", height)
            }
        }
    }

    @ReactMethod
    fun detectText(inputUri: String, promise: Promise) {
        submit(promise) {
            toWritableMap(TextDetector.detect(reactContext, inputUri))
        }
    }

    @ReactMethod
    fun removeText(options: ReadableMap, promise: Promise) {
        submit(promise) {
            val inputUri = options.getString("inputUri")
                ?: throw IllegalArgumentException("inputUri is required")
            val strokes = parseStrokes(options.getArray("strokes"))
            val rectangles = parseRectangles(options.getArray("rectangles"))
            val inpaintRadius = options.getDouble("inpaintRadius")
            val expandPixels = options.getDouble("maskExpandPixels").toInt()

            val full = ImageLoader.decode(reactContext, inputUri, null)
            val mask = MaskProcessor.buildMask(full.width, full.height, strokes, rectangles, expandPixels)
            val result = try {
                InpaintingEngine.inpaint(full, mask, inpaintRadius)
            } finally {
                mask.release()
                full.recycle()
            }

            val width = result.width
            val height = result.height
            val outputUri = ImageExporter.encodeToCache(
                reactContext,
                result,
                "cleantext_${System.currentTimeMillis()}.jpg",
            )
            result.recycle()

            Arguments.createMap().apply {
                putString("outputUri", outputUri)
                putInt("width", width)
                putInt("height", height)
            }
        }
    }

    @ReactMethod
    fun exportImage(uri: String, promise: Promise) {
        submit(promise) {
            ImageExporter.exportToGallery(reactContext, uri)
            null
        }
    }

    @ReactMethod
    fun cancelProcessing(promise: Promise) {
        cancelled.set(true)
        currentFuture?.cancel(true)
        promise.resolve(null)
    }

    private fun submit(promise: Promise, block: () -> WritableMap?) {
        cancelled.set(false)
        val future = executor.submit {
            try {
                if (cancelled.get()) {
                    promise.reject("CANCELLED", "Operation cancelled")
                    return@submit
                }
                val result = block()
                if (cancelled.get()) {
                    promise.reject("CANCELLED", "Operation cancelled")
                } else {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                if (cancelled.get() || e is InterruptedException) {
                    promise.reject("CANCELLED", "Operation cancelled", e)
                } else {
                    promise.reject("PROCESSING_ERROR", e.message ?: "Processing failed", e)
                }
            }
        }
        currentFuture = future
    }

    private fun parseStrokes(array: ReadableArray?): List<MaskProcessor.Stroke> {
        if (array == null) {
            return emptyList()
        }
        val strokes = mutableListOf<MaskProcessor.Stroke>()
        for (i in 0 until array.size()) {
            val stroke = array.getMap(i)
            val mode = stroke.getString("mode") ?: "brush"
            val radius = stroke.getDouble("radius")
            val points = mutableListOf<MaskProcessor.StrokePoint>()
            val pointsArray = stroke.getArray("points")
            if (pointsArray != null) {
                for (j in 0 until pointsArray.size()) {
                    val p = pointsArray.getMap(j)
                    points.add(MaskProcessor.StrokePoint(p.getDouble("x"), p.getDouble("y")))
                }
            }
            strokes.add(MaskProcessor.Stroke(mode, radius, points))
        }
        return strokes
    }

    private fun parseRectangles(array: ReadableArray?): List<Rect> {
        if (array == null) {
            return emptyList()
        }
        val rectangles = mutableListOf<Rect>()
        for (i in 0 until array.size()) {
            val r = array.getMap(i)
            rectangles.add(
                Rect(
                    r.getDouble("x").toInt(),
                    r.getDouble("y").toInt(),
                    r.getDouble("width").toInt(),
                    r.getDouble("height").toInt(),
                ),
            )
        }
        return rectangles
    }

    private fun toWritableMap(result: TextDetector.Result): WritableMap {
        val regions = Arguments.createArray()
        for (region in result.regions) {
            val box = Arguments.createMap().apply {
                putInt("x", region.box.left)
                putInt("y", region.box.top)
                putInt("width", region.box.width())
                putInt("height", region.box.height())
            }
            regions.pushMap(
                Arguments.createMap().apply {
                    putString("id", region.id)
                    putString("text", region.text)
                    putMap("box", box)
                },
            )
        }
        return Arguments.createMap().apply {
            putInt("width", result.width)
            putInt("height", result.height)
            putArray("regions", regions)
        }
    }

    companion object {
        private const val PICK_IMAGE_REQUEST = 3001
    }
}
