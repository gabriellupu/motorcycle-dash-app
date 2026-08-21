import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { VectorBike } from '../../../components/bike/VectorBike';
import { Button } from '../../../components/ui/Controls';
import { Txt } from '../../../components/ui/Txt';
import { useLayout } from '../../../hooks/useLayout';
import { useTheme } from '../../../theme/ThemeProvider';
import { rgba } from '../../../utils/color';
import { OnboardingScaffold } from '../OnboardingScaffold';

/**
 * First contact: the bike rotates in out of the dark while the tagline lands.
 * Sets the tone for the whole app in about a second and a half.
 */
export function WelcomeStep({
  step,
  stepCount,
  onNext,
  onSkip,
}: {
  step: number;
  stepCount: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const layout = useLayout();
  const spin = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    spin.value = withDelay(150, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }));
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [float, spin]);

  const bikeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(spin.value, [0, 0.3, 1], [0, 0.7, 1]),
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(spin.value, [0, 1], [110, 0])}deg` },
      { scale: interpolate(spin.value, [0, 1], [1.3, 1]) },
      { translateY: interpolate(float.value, [0, 1], [0, -10]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(spin.value, [0, 0.6, 1], [0, 0.8, 0.4]),
    transform: [{ scale: interpolate(spin.value, [0, 1], [0.6, 1]) }],
  }));

  const bikeSize = layout.isLandscape ? layout.width * 0.4 : layout.width * 0.86;

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title="Your bike, your dash."
      subtitle="A digital cluster built around your motorcycle: AI artwork of your actual bike, GPS speed out of the box, and full engine telemetry when you plug in a Bluetooth OBD adapter."
      aside={
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: bikeSize * 0.9,
                height: bikeSize * 0.45,
                borderRadius: bikeSize,
                backgroundColor: rgba(theme.colors.glow, 0.16),
              },
              glowStyle,
            ]}
          />
          <Animated.View style={bikeStyle}>
            <VectorBike size={bikeSize} />
          </Animated.View>
        </View>
      }
      footer={
        <View style={{ gap: 10 }}>
          <Button label="Set up my dash" onPress={onNext} size="lg" />
          <Button label="Skip — just show me the dash" variant="ghost" onPress={onSkip} />
        </View>
      }
    >
      <View style={{ gap: 12, justifyContent: 'center', flex: 1 }}>
        {[
          ['AI artwork', 'Pick your make, model and year — or photograph your own bike and let the AI cut it out.'],
          ['GPS first', 'Speed, heading and a live map with no wiring at all.'],
          ['Full telemetry', 'RPM, temperatures, oil pressure and fault codes over a Bluetooth OBD dongle.'],
        ].map(([title, body]) => (
          <View key={title} style={{ flexDirection: 'row', gap: 12 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                marginTop: 6,
                backgroundColor: theme.colors.accent,
              }}
            />
            <View style={{ flex: 1 }}>
              <Txt variant="heading" size={14}>
                {title}
              </Txt>
              <Txt variant="caption" dim style={{ lineHeight: 17 }}>
                {body}
              </Txt>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
