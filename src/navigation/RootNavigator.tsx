import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Txt } from '../components/ui/Txt';
import { useDashSession } from '../hooks/useDashSession';
import { DashScreen } from '../screens/DashScreen';
import { IgnitionScreen } from '../screens/IgnitionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import { useAppStore } from '../state/appStore';

import { useRouter } from './router';

/**
 * Route switch with cross-fades.
 *
 * A handful of full-screen destinations with bespoke transitions is a better
 * fit for a dash than a stack navigator: nothing here is a "page" you push.
 */
export function RootNavigator() {
  const route = useRouter((s) => s.route);
  const reset = useRouter((s) => s.reset);
  const previousRoute = useRouter((s) => s.history[s.history.length - 1]);
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => s.settings.onboarded);
  const startupSequence = useAppStore((s) => s.settings.startupSequence);

  // Sensors stay live across Dash → Settings so calibration and diagnostics see
  // real data, and returning to the dash does not re-acquire a GPS fix.
  useDashSession(route === 'dash' || route === 'settings');

  // Decide the landing screen once persisted state is available.
  useEffect(() => {
    if (!hydrated || route !== 'boot') return;
    if (!onboarded) reset('onboarding');
    else reset(startupSequence ? 'ignition' : 'dash');
  }, [hydrated, onboarded, reset, route, startupSequence]);

  if (!hydrated || route === 'boot') {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="label" dim>
            Moto Dash
          </Txt>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <Animated.View
      key={route}
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(160)}
      style={{ flex: 1 }}
    >
      {route === 'onboarding' ? <OnboardingFlow /> : null}
      {route === 'ignition' ? <IgnitionScreen /> : null}
      {route === 'dash' ? (
        <DashScreen animateIn={previousRoute === 'ignition' || previousRoute === 'onboarding'} />
      ) : null}
      {route === 'settings' ? <SettingsScreen /> : null}
    </Animated.View>
  );
}
