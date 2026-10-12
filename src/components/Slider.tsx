import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

/**
 * Minimal dependency-free slider (a draggable thumb on a track). Avoids a native
 * slider dependency while keeping one-hand brush-size control.
 */
export default function Slider({ min, max, value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const startFraction = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startFraction.current = max === min ? 0 : (valueRef.current - min) / (max - min);
      },
      onPanResponderMove: (_evt, gesture) => {
        if (width <= 0) {
          return;
        }
        const f = Math.min(1, Math.max(0, startFraction.current + gesture.dx / width));
        onChange(min + f * (max - min));
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const fraction = max === min ? 0 : (value - min) / (max - min);

  return (
    <View style={styles.track} onLayout={onLayout} {...responder.panHandlers}>
      <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      <View style={[styles.thumb, { left: Math.max(0, fraction * (width || 1) - 10) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 28,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
