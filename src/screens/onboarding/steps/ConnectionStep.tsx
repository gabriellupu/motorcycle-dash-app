import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '../../../components/ui/Controls';
import { Panel } from '../../../components/ui/Panel';
import { Txt } from '../../../components/ui/Txt';
import { VehicleType } from '../../../data/vehicles';
import { bleService } from '../../../services/ble/BleService';
import { useAppStore } from '../../../state/appStore';
import { useLiveStore } from '../../../state/liveStore';
import { useTheme } from '../../../theme/ThemeProvider';
import { OnboardingScaffold } from '../OnboardingScaffold';

/**
 * Bluetooth pairing, or an honest explanation of what you get without it.
 *
 * Skipping is a first-class choice here: GPS speed and the map work with no
 * hardware at all, and the dash says so rather than nagging.
 */
export function ConnectionStep({
  step,
  stepCount,
  vehicleType,
  onBack,
  onNext,
}: {
  step: number;
  stepCount: number;
  vehicleType: VehicleType;
  onBack: () => void;
  onNext: (choice: 'ble' | 'demo' | 'skip') => void;
}) {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);

  const devices = useLiveStore((s) => s.devices);
  const connection = useLiveStore((s) => s.connection);
  const connectionError = useLiveStore((s) => s.connectionError);
  const deviceName = useLiveStore((s) => s.deviceName);

  const [bleAvailable, setBleAvailable] = useState<boolean | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void bleService.isAvailable().then(setBleAvailable);
    return () => bleService.stopScan();
  }, []);

  const scan = useCallback(
    (all: boolean) => {
      setShowAll(all);
      void bleService.scan({ showAll: all });
    },
    [],
  );

  const connect = useCallback(
    async (id: string, name: string) => {
      const ok = await bleService.connect(id, {
        customPids: settings.customPids,
        pollIntervalMs: settings.pollIntervalMs,
      });
      if (ok) {
        patchSettings({ lastDeviceId: id, lastDeviceName: name, demoMode: false });
      }
    },
    [patchSettings, settings.customPids, settings.pollIntervalMs],
  );

  const scanning = connection === 'scanning';
  const linking = connection === 'connecting' || connection === 'handshaking';
  const connected = connection === 'connected';

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title={vehicleType === 'car' ? 'Plug into the car?' : 'Plug into the bike?'}
      subtitle={
        vehicleType === 'car'
          ? 'Every car since 2001 has an OBD-II port under the dash. A cheap Bluetooth adapter (ELM327 and friends) unlocks RPM, coolant and intake temperature, throttle, battery voltage, fuel level and stored fault codes. Without one the dash still runs on GPS.'
          : 'A Bluetooth OBD adapter (ELM327 and friends) unlocks RPM, gear, coolant and oil temperature, battery voltage and stored fault codes. Bike coverage varies by model. Without one the dash still runs on GPS.'
      }
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 0.5 }} />
          <Button
            label={connected ? 'Continue with the ECU link' : 'Continue on GPS only'}
            size="lg"
            onPress={() => onNext(connected ? 'ble' : 'skip')}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        <Panel style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: connected
                  ? theme.colors.success
                  : linking
                    ? theme.colors.warn
                    : theme.colors.textFaint,
              }}
            />
            <Txt variant="heading" size={15} style={{ flex: 1 }}>
              {connected
                ? `Linked to ${deviceName ?? 'adapter'}`
                : linking
                  ? 'Negotiating with the adapter…'
                  : scanning
                    ? 'Scanning…'
                    : 'Not connected'}
            </Txt>
            {scanning || linking ? <ActivityIndicator color={theme.colors.accent} /> : null}
          </View>

          {connectionError ? (
            <Txt variant="caption" color={theme.colors.danger}>
              {connectionError}
            </Txt>
          ) : null}

          {bleAvailable === false ? (
            <Txt variant="caption" dim style={{ lineHeight: 17 }}>
              Bluetooth needs a development build — it does not exist in Expo Go. Everything else
              works here, and you can pair later from Settings.
            </Txt>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label={scanning ? 'Scanning…' : 'Scan for adapters'}
              variant="secondary"
              onPress={() => scan(false)}
              disabled={scanning || bleAvailable === false}
              style={{ flex: 1 }}
            />
            {connected ? (
              <Button
                label="Disconnect"
                variant="danger"
                onPress={() => void bleService.disconnect()}
              />
            ) : null}
          </View>

          {devices.map((device) => (
            <Pressable
              key={device.id}
              accessibilityRole="button"
              onPress={() => void connect(device.id, device.name)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: theme.shape.radiusSm,
                backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
                borderWidth: theme.shape.borderWidth,
                borderColor: theme.colors.border,
              })}
            >
              <View style={{ flex: 1 }}>
                <Txt variant="body" size={14}>
                  {device.name}
                </Txt>
                <Txt variant="mono" size={10} faint>
                  {device.id}
                </Txt>
              </View>
              <Txt variant="label" size={10} dim>
                {device.rssi != null ? `${device.rssi} dBm` : ''}
              </Txt>
            </Pressable>
          ))}

          {!scanning && devices.length === 0 && bleAvailable !== false ? (
            <Pressable onPress={() => scan(true)}>
              <Txt variant="caption" color={theme.colors.accent}>
                {showAll ? 'Nothing found. Turn the ignition on and scan again.' : 'Adapter not listed? Show every Bluetooth device'}
              </Txt>
            </Pressable>
          ) : null}
        </Panel>

        <Panel alt style={{ gap: 8 }}>
          <Txt variant="heading" size={14}>
            No adapter right now?
          </Txt>
          <Txt variant="caption" dim style={{ lineHeight: 17 }}>
            GPS gives you speed, heading, altitude and the moving map. RPM, gear and engine
            temperatures stay dark until an adapter is connected — the dash marks them as
            unavailable rather than inventing numbers.
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label="Skip — GPS only"
              variant="secondary"
              onPress={() => {
                patchSettings({ demoMode: false });
                onNext('skip');
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Demo data"
              variant="ghost"
              onPress={() => {
                patchSettings({ demoMode: true });
                onNext('demo');
              }}
              style={{ flex: 1 }}
            />
          </View>
          <Txt variant="caption" faint>
            Demo mode animates a simulated drive so you can see every gauge. It is always labelled
            DEMO on the dash.
          </Txt>
        </Panel>
      </ScrollView>
    </OnboardingScaffold>
  );
}
