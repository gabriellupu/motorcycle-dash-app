import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';
import { Txt } from '../ui/Txt';

interface Props {
  rpm: number | null;
  redlineRpm: number;
  maxRpm: number;
  width: number;
  height?: number;
  segments?: number;
  /** No engine data source — render the strip unlit rather than hiding it. */
  inactive?: boolean;
  showScale?: boolean;
}

/**
 * Shift light strip.
 *
 * A segmented tach reads far faster than a needle at speed, and the whole strip
 * flashes past the redline — the one piece of the dash designed to be read with
 * peripheral vision.
 */
export function RpmBar({
  rpm,
  redlineRpm,
  maxRpm,
  width,
  height = 16,
  segments = 30,
  inactive,
  showScale = true,
}: Props) {
  const theme = useTheme();
  const value = rpm ?? 0;
  const fraction = Math.max(0, Math.min(1, value / Math.max(1, maxRpm)));
  const redlineFraction = redlineRpm / Math.max(1, maxRpm);
  const overRedline = !inactive && rpm != null && value >= redlineRpm;

  const flash = useSharedValue(0);
  useEffect(() => {
    if (overRedline) {
      flash.value = withRepeat(
        withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 110 })),
        -1,
        false,
      );
    } else {
      flash.value = withTiming(0, { duration: 150 });
    }
  }, [flash, overRedline]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.55 }));

  const lit = Math.round(fraction * segments);

  return (
    <View style={{ width, gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 2, height }}>
        {Array.from({ length: segments }, (_, i) => {
          const segmentFraction = (i + 1) / segments;
          const isLit = !inactive && i < lit;
          const color =
            segmentFraction >= redlineFraction
              ? theme.colors.redline
              : segmentFraction >= redlineFraction * 0.86
                ? theme.colors.warn
                : theme.colors.accent;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height,
                borderRadius: theme.shape.radiusSm / 2,
                backgroundColor: isLit ? color : rgba(color, 0.1),
                // A soft leading edge stops the strip looking like a progress bar.
                opacity: isLit ? 1 : 0.55,
              }}
            />
          );
        })}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -6,
            right: -6,
            top: -6,
            height: height + 12,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.redline,
          },
          flashStyle,
        ]}
      />

      {showScale ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt variant="label" size={8} faint>
            {inactive ? 'RPM — no engine data' : 'RPM'}
          </Txt>
          <Txt variant="mono" size={9} dim>
            {inactive || rpm == null ? '—' : Math.round(value).toLocaleString()}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
