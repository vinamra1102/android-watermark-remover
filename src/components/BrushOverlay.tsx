import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import type { BrushStroke, FittedRect } from '../types';
import { colors } from '../theme';

interface Props {
  strokes: BrushStroke[];
  fit: FittedRect;
}

/**
 * Renders the manual brush mask as translucent vector strokes. Points are stored
 * in normalized image coordinates and mapped into the fitted (on-screen) image
 * rect. Erase strokes are drawn in a neutral tone so their extent stays visible
 * while they remove white from the underlying mask.
 */
export default function BrushOverlay({ strokes, fit }: Props) {
  return (
    <Svg
      pointerEvents="none"
      width={fit.width}
      height={fit.height}
      style={[styles.overlay, { left: fit.x, top: fit.y }]}
    >
      {strokes.map((stroke) => {
        const points = stroke.points
          .map((p) => `${p.x * fit.width},${p.y * fit.height}`)
          .join(' ');
        return (
          <Polyline
            key={stroke.id}
            points={points}
            fill="none"
            stroke={stroke.mode === 'brush' ? colors.maskStroke : colors.surfaceElevated}
            strokeWidth={Math.max(1, stroke.radius * fit.width * 2)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={stroke.mode === 'brush' ? 0.9 : 0.8}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
  },
});
