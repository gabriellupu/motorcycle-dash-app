import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Warning, WarningId } from '../../services/warnings';
import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';

interface Props {
  warnings: Warning[];
  size?: number;
  /** Illuminates every lamp — the ignition-on bulb check. */
  selfTest?: boolean;
  vertical?: boolean;
  onPress?: (warning: Warning) => void;
}

/** The lamp row. Unlit lamps stay visible so the cluster keeps its shape. */
export function WarningLights({ warnings, size = 26, selfTest, vertical, onPress }: Props) {
  return (
    <View
      style={{
        flexDirection: vertical ? 'column' : 'row',
        gap: 10,
        alignItems: 'center',
        flexWrap: vertical ? 'nowrap' : 'wrap',
      }}
    >
      {warnings.map((warning) => (
        <Lamp
          key={warning.id}
          warning={warning}
          size={size}
          selfTest={selfTest}
          onPress={onPress}
        />
      ))}
    </View>
  );
}

function Lamp({
  warning,
  size,
  selfTest,
  onPress,
}: {
  warning: Warning;
  size: number;
  selfTest?: boolean;
  onPress?: (warning: Warning) => void;
}) {
  const theme = useTheme();
  const lit = selfTest || warning.active;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (warning.active && warning.severity === 'danger' && !selfTest) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [pulse, selfTest, warning.active, warning.severity]);

  const style = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.55 }));

  const color = !lit
    ? warning.monitored
      ? theme.colors.textFaint
      : rgba(theme.colors.textFaint, 0.35)
    : warning.severity === 'danger'
      ? theme.colors.danger
      : warning.severity === 'warn'
        ? theme.colors.warn
        : theme.colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${warning.label}: ${warning.active ? 'active' : 'normal'}`}
      onPress={onPress ? () => onPress(warning) : undefined}
      hitSlop={6}
    >
      <Animated.View style={style}>
        <LampIcon id={warning.id} size={size} color={color} />
      </Animated.View>
    </Pressable>
  );
}

/** Simplified cluster glyphs, drawn to read at 20–28 px. */
export function LampIcon({ id, size, color }: { id: WarningId; size: number; color: string }) {
  const stroke = 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {id === 'mil' ? (
        <Path
          d="M4 10h2V8h2V6h6l2 2h2v2h2v6h-3v2h-4v-2h-3v2H6v-2H4z"
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
      ) : null}

      {id === 'oilPressure' ? (
        <>
          <Path
            d="M13 7h5l2 3v5h-9V9c0-1 .8-2 2-2z"
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
          <Path d="M11 12H5l3-3" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <Path d="M6 17c1.2-2 2-3 2-4" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </>
      ) : null}

      {id === 'coolant' || id === 'oilTemp' ? (
        <>
          <Path
            d="M12 4v9"
            stroke={color}
            strokeWidth={stroke * 1.6}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={16} r={3.4} fill="none" stroke={color} strokeWidth={stroke} />
          <Path
            d="M4 18c1.5-1.4 2.5-1.4 4 0M16 18c1.5-1.4 2.5-1.4 4 0"
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {id === 'battery' ? (
        <>
          <Rect x={3} y={8} width={18} height={9} rx={1.5} fill="none" stroke={color} strokeWidth={stroke} />
          <Path d="M7 8V6h3v2M14 8V6h3v2" fill="none" stroke={color} strokeWidth={stroke} />
          <Path
            d="M6.5 12.5h3M8 11v3M14.5 12.5h3"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {id === 'fuel' ? (
        <>
          <Path
            d="M5 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
          <Path d="M4 20h10" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <Path d="M6.5 7.5h5v3h-5z" fill="none" stroke={color} strokeWidth={stroke} />
          <Path
            d="M13 9h3.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 1.5 1.5"
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {id === 'speedAlert' ? (
        <>
          <Circle cx={12} cy={12} r={8} fill="none" stroke={color} strokeWidth={stroke} />
          <Path d="M12 12l4-3" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <Path d="M12 4v2M20 12h-2M12 20v-2M4 12h2" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  );
}
