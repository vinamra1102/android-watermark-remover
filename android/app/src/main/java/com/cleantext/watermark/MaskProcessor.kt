package com.cleantext.watermark

import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.Point
import org.opencv.core.Rect
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/**
 * Builds a single-channel binary mask from manual brush strokes and selected OCR
 * rectangles, then dilates it to cover antialiased text edges.
 *
 * Polarity: white (255) = reconstruct, black (0) = preserve.
 */
object MaskProcessor {

    data class StrokePoint(val x: Double, val y: Double)

    data class Stroke(val mode: String, val radius: Double, val points: List<StrokePoint>)

    fun buildMask(
        width: Int,
        height: Int,
        strokes: List<Stroke>,
        rectangles: List<Rect>,
        expandPixels: Int,
    ): Mat {
        val mask = Mat.zeros(height, width, CvType.CV_8UC1)

        // Selected OCR rectangles are filled white first.
        for (rect in rectangles) {
            val x0 = rect.x.toDouble().coerceIn(0.0, width.toDouble())
            val y0 = rect.y.toDouble().coerceIn(0.0, height.toDouble())
            val x1 = (rect.x + rect.width).toDouble().coerceIn(0.0, width.toDouble())
            val y1 = (rect.y + rect.height).toDouble().coerceIn(0.0, height.toDouble())
            if (x1 > x0 && y1 > y0) {
                Imgproc.rectangle(mask, Point(x0, y0), Point(x1, y1), Scalar(255.0), -1)
            }
        }

        // Manual strokes are applied in order on top, so an erase stroke can trim
        // a rectangle or an earlier brush stroke.
        for (stroke in strokes) {
            val value = if (stroke.mode == "erase") Scalar(0.0) else Scalar(255.0)
            val radiusPx = (stroke.radius * width).toInt().coerceAtLeast(1)
            val pts = stroke.points.map {
                Point(
                    (it.x * width).coerceIn(0.0, width.toDouble()),
                    (it.y * height).coerceIn(0.0, height.toDouble()),
                )
            }
            when {
                pts.size == 1 -> {
                    Imgproc.circle(mask, pts[0], radiusPx, value, -1, Imgproc.LINE_AA)
                }
                pts.size > 1 -> {
                    val poly = MatOfPoint(*pts.toTypedArray())
                    Imgproc.polylines(mask, listOf(poly), false, value, radiusPx * 2, Imgproc.LINE_AA)
                    for (p in pts) {
                        Imgproc.circle(mask, p, radiusPx, value, -1, Imgproc.LINE_AA)
                    }
                    poly.release()
                }
            }
        }

        if (expandPixels > 0) {
            val kernelSize = 2 * expandPixels + 1
            val kernel = Imgproc.getStructuringElement(
                Imgproc.MORPH_ELLIPSE,
                Size(kernelSize.toDouble(), kernelSize.toDouble()),
            )
            Imgproc.dilate(mask, mask, kernel)
        }

        return mask
    }
}
