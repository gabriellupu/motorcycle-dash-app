import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { VehicleStage } from '../components/dash/VehicleStage';
import { Gauge } from '../components/dash/Gauge';
import { RpmBar } from '../components/dash/RpmBar';
import { WarningLights } from '../components/dash/WarningLights';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Txt } from '../components/ui/Txt';
import { useLayout } from '../hooks/useLayout';
import { navigate } from '../navigation/router';
import { computeWarnings } from '../services/warnings';
import { useAppStore } from '../state/appStore';
import { emptyTelemetry, isElectricProfile } from '../state/types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Ignition-on sequence — the cluster self-test every vehicle does, plus the
 * bike or car rotating in out of nothing.
 *
 * Timeline (~3.4 s, tap to skip):
 *   0.0  lamp self-test, all bulbs lit
 *   0.3  needle/arc sweeps to full scale
 *   1.1  sweep falls back to zero, bike rotates in from the front
 *   2.1  lamps extinguish, bike name resolves
 *   3.0  READY, hand over to the dash
 */
export function IgnitionScreen() {
  const theme = useTheme();
  const layout = useLayout();
  const settings = useAppStore((s) => s.settings);
  const vehicle = useAppStore((s) => s.vehicle);

  const [stage, setStage] = useState(0);
  const reduce = settings.animations !== 'full';

  useEffect(() => {
    if (settings.animations === 'off') {
      navigate('dash');
      return;
    }
    const scale = reduce ? 0.45 : 1;
    const marks = [300, 1100, 2100, 3000, 3400].map((ms) => Math.round(ms * scale));
    const timers = marks.map((ms, index) =>
      setTimeout(() => {
        if (index === marks.length - 1) {
          navigate('dash');
        } else {
          setStage(index + 1);
          if (settings.hapticAlerts && Platform.OS !== 'web' && index === 0) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduce, settings.animations, settings.hapticAlerts]);

  const warnings = useMemo(
    () => computeWarnings(emptyTelemetry, settings.thresholds, new Set()),
    [settings.thresholds],
  );

  const gaugeSize = Math.min(layout.width * 0.72, layout.height * (layout.isLandscape ? 0.6 : 0.4));
  const maxSpeed = vehicle?.maxSpeedKph ?? 220;
  const maxRpm = vehicle?.maxRpm ?? 12_000;
  const electric = isElectricProfile(vehicle);

  // Stage 1 pins every gauge to full scale; stage 2 lets them fall back.
  const sweepSpeed = stage === 1 ? maxSpeed : 0;
  const sweepRpm = stage === 1 ? maxRpm : 0;

  const frames = useMemo(() => {
    if (!settings.showVehicle) return [];
    return vehicle?.angleUris?.length
      ? vehicle.angleUris
      : vehicle?.heroUri
        ? [vehicle.heroUri]
        : [];
  }, [vehicle?.angleUris, vehicle?.heroUri, settings.showVehicle]);

  return (
    <ScreenBackground>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip startup animation"
        onPress={() => navigate('dash')}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}
      >
        <Animated.View entering={FadeIn.duration(320)} style={{ alignItems: 'center', gap: 6 }}>
          <Txt variant="label" size={11} color={theme.colors.accent}>
            {stage >= 3 ? 'Systems ready' : 'Ignition'}
          </Txt>
          <Txt variant="title" size={layout.isTablet ? 30 : 22}>
            {stage >= 2 && vehicle ? `${vehicle.make} ${vehicle.model}` : 'MOTO DASH'}
          </Txt>
        </Animated.View>

        {electric ? null : (
          <RpmBar
            rpm={sweepRpm}
            redlineRpm={vehicle?.redlineRpm ?? 10_500}
            maxRpm={maxRpm}
            width={Math.min(layout.width - 48, 520)}
            showScale={false}
          />
        )}

        <Gauge
          value={sweepSpeed}
          max={maxSpeed}
          size={gaugeSize}
          redlineFrom={0.86}
          animateMs={stage === 1 ? 800 : 600}
        >
          <Txt variant="value" size={gaugeSize * 0.2}>
            {stage >= 3 ? '0' : ''}
          </Txt>
        </Gauge>

        {stage >= 2 ? (
          <Animated.View entering={FadeIn.duration(400)}>
            <VehicleStage
              frames={frames}
              vehicleType={vehicle?.type ?? 'motorcycle'}
              bodyStyle={vehicle?.bodyStyle}
              width={Math.min(layout.width * 0.8, 460)}
              height={Math.min(layout.height * 0.24, 190)}
              side={settings.vehicleSide}
              animateIn
              reduceMotion={reduce}
            />
          </Animated.View>
        ) : null}

        <Animated.View exiting={FadeOut.duration(300)}>
          <WarningLights warnings={warnings} selfTest={stage < 3} size={26} />
        </Animated.View>

        <Txt variant="caption" faint size={10}>
          Tap to skip
        </Txt>
      </Pressable>
    </ScreenBackground>
  );
}
