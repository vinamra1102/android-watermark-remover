import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface Props {
  imageUri: string;
  zoom: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  children?: React.ReactNode;
}

/**
 * Displays the image inside a single transform container. Zoom scales around the
 * viewport center (the aspect-fit center) and pan is a plain screen-space offset,
 * matching the coordinate math in `src/utils/coordinates.ts`.
 */
export default function ImageCanvas({ imageUri, zoom, translateX, translateY, children }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: zoom.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      {children}
    </Animated.View>
  );
}
