import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { VehicleType } from '../../data/vehicles';
import { VehicleAngle } from '../../state/types';
import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';

/** Where the camera stands for each angle, in the 100×100 plan view. */
const CAMERA: Record<VehicleAngle, { x: number; y: number }> = {
  side: { x: 88, y: 50 },
  frontQuarter: { x: 82, y: 18 },
  front: { x: 50, y: 8 },
  rearQuarter: { x: 82, y: 84 },
  rear: { x: 50, y: 94 },
};

/**
 * A plan view of the vehicle with a camera position — "stand here, point there".
 *
 * Far clearer than repeating the same side-profile silhouette in every empty
 * capture slot, and it works for a bike and a car alike.
 */
export function AngleDiagram({
  angle,
  type,
  size = 88,
}: {
  angle: VehicleAngle;
  type: VehicleType;
  size?: number;
}) {
  const theme = useTheme();
  const line = theme.colors.textFaint;
  const accent = theme.colors.accent;
  const camera = CAMERA[angle];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Sight line from the camera to the middle of the vehicle */}
        <Line
          x1={camera.x}
          y1={camera.y}
          x2={50}
          y2={50}
          stroke={rgba(accent, 0.55)}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        <G>
          {type === 'car' ? (
            <>
              {/* Car from above: body, roof, nose marker */}
              <Rect
                x={34}
                y={20}
                width={32}
                height={60}
                rx={10}
                fill={rgba(theme.colors.text, 0.08)}
                stroke={line}
                strokeWidth={2}
              />
              <Rect
                x={39}
                y={36}
                width={22}
                height={26}
                rx={5}
                fill="none"
                stroke={line}
                strokeWidth={1.5}
              />
            </>
          ) : (
            <>
              {/* Bike from above: two wheels and a narrow body */}
              <Rect
                x={44}
                y={24}
                width={12}
                height={52}
                rx={6}
                fill={rgba(theme.colors.text, 0.08)}
                stroke={line}
                strokeWidth={2}
              />
              <Rect x={46} y={18} width={8} height={14} rx={3} fill={line} />
              <Rect x={46} y={68} width={8} height={14} rx={3} fill={line} />
              <Line x1={34} y1={38} x2={66} y2={38} stroke={line} strokeWidth={2} />
            </>
          )}
          {/* Nose marker: the vehicle points up */}
          <Path d="M50 12 L56 20 L44 20 Z" fill={line} />
        </G>

        {/* The camera */}
        <Circle cx={camera.x} cy={camera.y} r={7} fill={rgba(accent, 0.22)} />
        <Circle cx={camera.x} cy={camera.y} r={3.2} fill={accent} />
      </Svg>
    </View>
  );
}
