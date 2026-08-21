import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { VectorVehicle } from '../../../components/vehicle/VectorVehicle';
import { ThemePicker } from '../../../components/settings/ThemePicker';
import { Button, Segmented } from '../../../components/ui/Controls';
import { Panel } from '../../../components/ui/Panel';
import { Txt } from '../../../components/ui/Txt';
import { useAppStore } from '../../../state/appStore';
import { useLiveStore } from '../../../state/liveStore';
import { VehicleProfile } from '../../../state/types';
import { useTheme } from '../../../theme/ThemeProvider';
import { OnboardingScaffold } from '../OnboardingScaffold';

/** Last stop: pick the look, confirm the setup, fire the ignition sequence. */
export function ReadyStep({
  step,
  stepCount,
  vehicle,
  onBack,
  onFinish,
}: {
  step: number;
  stepCount: number;
  vehicle: VehicleProfile;
  onBack: () => void;
  onFinish: () => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const transport = useLiveStore((s) => s.transport);
  const connection = useLiveStore((s) => s.connection);

  const linked = transport === 'ble' && connection === 'connected';

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title="Pick your look."
      subtitle="Themes change gauges, type and effects — not the data. Swap them any time from Settings, or build your own."
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 0.5 }} />
          <Button label="Start the dash" size="lg" onPress={onFinish} style={{ flex: 1 }} />
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
        <ThemePicker
          value={settings.themeId}
          onChange={(themeId) => patchSettings({ themeId })}
        />

        <Panel style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 120, height: 74, justifyContent: 'center' }}>
              {vehicle.heroUri ? (
                <Image
                  source={{ uri: vehicle.heroUri }}
                  style={{ width: 120, height: 74 }}
                  contentFit="contain"
                />
              ) : (
                <VectorVehicle type={vehicle.type} bodyStyle={vehicle.bodyStyle} size={120} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="heading" size={16}>
                {`${vehicle.year} ${vehicle.make}`}
              </Txt>
              <Txt variant="title" size={20}>
                {vehicle.model}
              </Txt>
              <Txt variant="caption" dim>
                {`Redline ${vehicle.redlineRpm.toLocaleString()} rpm · scale to ${vehicle.maxSpeedKph} km/h`}
              </Txt>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Row label="Artwork" value={describeOrigin(vehicle)} />
            <Row
              label="Engine data"
              value={
                settings.demoMode
                  ? 'Demo simulation'
                  : linked
                    ? 'Bluetooth OBD linked'
                    : 'GPS only — no engine data'
              }
            />
            <Row label="Speed" value="GPS, switching to the ECU when it reports" />
          </View>
        </Panel>

        <View style={{ gap: 8 }}>
          <Txt variant="label" dim>
            Units
          </Txt>
          <Segmented
            value={settings.units}
            onChange={(units) => patchSettings({ units })}
            options={[
              { value: 'metric', label: 'km/h · °C' },
              { value: 'imperial', label: 'mph · °F' },
            ]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Txt variant="label" dim>
            Vehicle sits on the
          </Txt>
          <Segmented
            value={settings.vehicleSide}
            onChange={(vehicleSide) => patchSettings({ vehicleSide })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </View>

        <Txt variant="caption" faint style={{ lineHeight: 16 }}>
          Tip: mount the phone in landscape for the widest cluster. Both orientations have their own
          layout and neither one scrolls.
        </Txt>
      </ScrollView>
    </OnboardingScaffold>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Txt variant="label" size={10} dim style={{ width: 92 }}>
        {label}
      </Txt>
      <Txt variant="caption" size={12} color={theme.colors.text} style={{ flex: 1 }}>
        {value}
      </Txt>
    </View>
  );
}

function describeOrigin(vehicle: VehicleProfile): string {
  const shots = vehicle.photos.filter((p) => p.assetUri).length;
  switch (vehicle.assetOrigin) {
    case 'ai-generated':
      return `Catalogue render, background keyed out${shots > 1 ? ` · ${shots} angles` : ''}`;
    case 'ai-cutout':
      return `Your own photos, cut out${shots > 1 ? ` · ${shots} angles` : ''}`;
    default:
      return 'Built-in vector silhouette';
  }
}
