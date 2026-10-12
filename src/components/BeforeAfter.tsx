import React, { useRef, useState } from 'react';
import { Image, LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  beforeUri: string;
  afterUri: string;
}

/**
 * Slider comparison between the original (left) and processed (right) images.
 * The divider is draggable; both images render with `contain` so they stay aligned.
 */
export default function BeforeAfter({ beforeUri, afterUri }: Props) {
  const [position, setPosition] = useState(0.5);
  const [width, setWidth] = useState(0);
  const startPosition = useRef(0.5);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPosition.current = position;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (width <= 0) {
          return;
        }
        const next = Math.min(1, Math.max(0, startPosition.current + gesture.dx / width));
        setPosition(next);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 && (
        <>
          <Image source={{ uri: afterUri }} style={styles.full} resizeMode="contain" />
          <View style={[styles.beforeClip, { width: position * width }]}>
            <Image source={{ uri: beforeUri }} style={styles.full} resizeMode="contain" />
          </View>
          <View {...responder.panHandlers} style={[styles.divider, { left: position * width - 1 }]}>
            <View style={styles.handle} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  full: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  beforeClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRightWidth: 2,
    borderRightColor: colors.accent,
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
});
