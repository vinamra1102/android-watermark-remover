# Keep OpenCV classes (bundled AAR already ships its own rules, but be explicit).
-keep class org.opencv.** { *; }
-dontwarn org.opencv.**

# ML Kit bundled recognizers are already proguard-safe; keep the public entry points.
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
