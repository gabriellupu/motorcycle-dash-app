import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '../../../components/ui/Controls';
import { Txt } from '../../../components/ui/Txt';
import { VectorCar, VectorMotorcycle } from '../../../components/vehicle/VectorVehicle';
import { VehicleType } from '../../../data/vehicles';
import { useLayout } from '../../../hooks/useLayout';
import { useTheme } from '../../../theme/ThemeProvider';
import { rgba } from '../../../utils/color';
import { OnboardingScaffold } from '../OnboardingScaffold';

/**
 * Bike or car. The choice drives the catalogue, the photo angles the app asks
 * for, the fallback silhouette and which dash widgets make sense (a car does
 * not lean; a bike has no lateral-G tile by default).
 */
export function VehicleTypeStep({
  step,
  stepCount,
  value,
  onBack,
  onNext,
}: {
  step: number;
  stepCount: number;
  value: VehicleType | null;
  onBack: () => void;
  onNext: (type: VehicleType) => void;
}) {
  const layout = useLayout();

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title="What are we building this for?"
      subtitle="The dash adapts either way — gauges, artwork angles and the widgets it shows."
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 0.5 }} />
          <Button
            label={value ? `Continue with ${value === 'car' ? 'a car' : 'a motorcycle'}` : 'Pick one'}
            size="lg"
            disabled={!value}
            onPress={() => value && onNext(value)}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <View
        style={{
          flex: 1,
          gap: 14,
          justifyContent: 'center',
          flexDirection: layout.isLandscape ? 'row' : 'column',
        }}
      >
        <TypeCard
          type="motorcycle"
          title="Motorcycle"
          blurb="Tach with shift lights, lean angle, gear indicator."
          selected={value === 'motorcycle'}
          delay={0}
          onPress={() => onNext('motorcycle')}
        />
        <TypeCard
          type="car"
          title="Car"
          blurb="Full OBD-II telemetry, lateral G, coolant and fuel."
          selected={value === 'car'}
          delay={90}
          onPress={() => onNext('car')}
        />
      </View>
    </OnboardingScaffold>
  );
}

function TypeCard({
  type,
  title,
  blurb,
  selected,
  delay,
  onPress,
}: {
  type: VehicleType;
  title: string;
  blurb: string;
  selected: boolean;
  delay: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const layout = useLayout();
  const artSize = layout.isLandscape ? layout.width * 0.3 : layout.width * 0.62;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(360)} style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: theme.shape.radius,
          borderWidth: selected ? 2 : theme.shape.borderWidth,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          backgroundColor: selected ? rgba(theme.colors.accent, 0.1) : theme.colors.surface,
          padding: 16,
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
          minHeight: 150,
        })}
      >
        {type === 'car' ? (
          <VectorCar size={artSize} bodyStyle="hatch" />
        ) : (
          <VectorMotorcycle size={artSize} />
        )}
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Txt variant="heading" size={17}>
            {title}
          </Txt>
          <Txt variant="caption" dim style={{ textAlign: 'center' }}>
            {blurb}
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}
