import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VectorBike } from '../components/bike/VectorBike';
import { ThemePicker } from '../components/settings/ThemePicker';
import { Button, Field, SectionTitle, Segmented, SettingRow, Slider, Toggle } from '../components/ui/Controls';
import { Panel } from '../components/ui/Panel';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Txt } from '../components/ui/Txt';
import { goBack, resetTo } from '../navigation/router';
import { copyIntoBike, deleteBikeAssets, readAsBase64 } from '../services/ai/assetStore';
import { createBikeArtwork, describeArtworkError, turntableAngles } from '../services/ai/bikeArtwork';
import { IMAGE_MODELS, isConfigured, verifyApiKey } from '../services/ai/gemini';
import { bleService } from '../services/ble/BleService';
import { CUSTOM_PID_PRESETS } from '../services/ble/obd';
import { MAP_STYLES } from '../services/map/tiles';
import { imuService } from '../services/sensors/imuService';
import { useAppStore } from '../state/appStore';
import { useLiveStore } from '../state/liveStore';
import { CUSTOM_THEME_ID } from '../theme/custom';
import { useTheme } from '../theme/ThemeProvider';
import { listThemes } from '../theme/themes';
import { hsl } from '../utils/color';
import { pressureUnit, tempUnit } from '../utils/format';

/** Everything is configurable here; the dash itself stays uncluttered. */
export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const patch = useAppStore((s) => s.patchSettings);

  return (
    <ScreenBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: theme.shape.gap,
            paddingBottom: 10,
          }}
        >
          <Button label="Done" variant="secondary" size="sm" onPress={() => goBack()} />
          <Txt variant="title" size={22} style={{ flex: 1 }}>
            Settings
          </Txt>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <LookSection />
          <LayoutSection />
          <BikeSection />
          <DataSection />
          <AlertsSection />
          <AiSection />

          <SectionTitle>About</SectionTitle>
          <SettingRow
            title="Units"
            subtitle="Speed, distance, temperature and pressure"
            right={
              <Segmented
                compact
                style={{ width: 160 }}
                value={settings.units}
                onChange={(units) => patch({ units })}
                options={[
                  { value: 'metric', label: 'Metric' },
                  { value: 'imperial', label: 'Imperial' },
                ]}
              />
            }
          />
          <SettingRow
            title="24-hour clock"
            right={
              <Toggle value={settings.clock24h} onChange={(clock24h) => patch({ clock24h })} />
            }
          />
          <ResetSection />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

/* -------------------------------------------------------------------- Look */

function LookSection() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const patch = useAppStore((s) => s.patchSettings);
  const applyCustomTheme = useAppStore((s) => s.applyCustomTheme);

  const [hue, setHue] = useState(190);
  const [baseId, setBaseId] = useState(settings.customTheme?.baseId ?? 'ultramodern');

  return (
    <>
      <SectionTitle>Theme</SectionTitle>
      <View style={{ paddingHorizontal: theme.shape.gap }}>
        <ThemePicker value={settings.themeId} onChange={(themeId) => patch({ themeId })} />
      </View>

      <SettingRow
        title="Build a custom theme"
        subtitle="Pick a base look and an accent; everything else is derived."
      >
        <View style={{ gap: 12 }}>
          <Segmented
            compact
            value={baseId}
            onChange={setBaseId}
            options={listThemes()
              .filter((t) => !t.generated)
              .slice(0, 4)
              .map((t) => ({ value: t.id, label: t.name }))}
          />
          <View style={{ gap: 6 }}>
            <Txt variant="label" size={10} dim>
              Accent
            </Txt>
            <Slider value={hue} min={0} max={359} step={1} onChange={setHue} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: hsl(hue, 0.9, 0.58),
                }}
              />
              <Txt variant="mono" size={11} dim>
                {hsl(hue, 0.9, 0.58)}
              </Txt>
            </View>
          </View>
          <Button
            label={settings.themeId === CUSTOM_THEME_ID ? 'Update custom theme' : 'Apply custom theme'}
            variant="secondary"
            onPress={() =>
              applyCustomTheme({
                baseId,
                name: 'Custom',
                accent: hsl(hue, 0.9, 0.58),
                accentAlt: hsl((hue + 40) % 360, 0.85, 0.62),
              })
            }
          />
        </View>
      </SettingRow>

      <SettingRow
        title="Brightness"
        subtitle="Dims the whole dash without touching system brightness"
      >
        <Slider
          value={settings.brightness}
          min={0.25}
          max={1}
          step={0.05}
          onChange={(brightness) => patch({ brightness })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </SettingRow>

      <SettingRow
        title="Animations"
        subtitle="Reduced keeps transitions but drops the idle motion"
        right={
          <Segmented
            compact
            style={{ width: 190 }}
            value={settings.animations}
            onChange={(animations) => patch({ animations })}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
              { value: 'off', label: 'Off' },
            ]}
          />
        }
      />

      <SettingRow
        title="Startup sequence"
        subtitle="Cluster self-test and the 3D bike intro on launch"
        right={
          <Toggle
            value={settings.startupSequence}
            onChange={(startupSequence) => patch({ startupSequence })}
          />
        }
      />

      <SettingRow
        title="HUD mirror mode"
        subtitle="Mirrors the dash for reflecting off a windscreen"
        right={<Toggle value={settings.hudMirror} onChange={(hudMirror) => patch({ hudMirror })} />}
      />
    </>
  );
}

/* ------------------------------------------------------------------ Layout */

function LayoutSection() {
  const settings = useAppStore((s) => s.settings);
  const patch = useAppStore((s) => s.patchSettings);

  return (
    <>
      <SectionTitle>Layout</SectionTitle>
      <SettingRow
        title="Orientation"
        subtitle="Portrait and landscape each have their own no-scroll layout"
        right={
          <Segmented
            compact
            style={{ width: 190 }}
            value={settings.orientationLock}
            onChange={(orientationLock) => patch({ orientationLock })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'portrait', label: 'Portrait' },
              { value: 'landscape', label: 'Landscape' },
            ]}
          />
        }
      />
      <SettingRow
        title="Show the bike"
        right={<Toggle value={settings.showBike} onChange={(showBike) => patch({ showBike })} />}
      />
      <SettingRow
        title="Bike side"
        right={
          <Segmented
            compact
            style={{ width: 140 }}
            value={settings.bikeSide}
            onChange={(bikeSide) => patch({ bikeSide })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
          />
        }
      />
      <SettingRow title="Bike size">
        <Slider
          value={settings.bikeScale}
          min={0.7}
          max={1.3}
          step={0.05}
          onChange={(bikeScale) => patch({ bikeScale })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </SettingRow>

      <SettingRow
        title="Map preview"
        subtitle="Fades into the dash instead of sitting in a box"
        right={<Toggle value={settings.showMap} onChange={(showMap) => patch({ showMap })} />}
      />
      {settings.showMap ? (
        <>
          <SettingRow title="Map style">
            <Segmented
              compact
              value={settings.mapStyleId}
              onChange={(mapStyleId) => patch({ mapStyleId })}
              options={MAP_STYLES.map((style) => ({
                value: style.id,
                label: style.id === 'none' ? 'Grid' : style.name,
              }))}
            />
          </SettingRow>
          <SettingRow title="Map zoom">
            <Slider
              value={settings.mapZoom}
              min={11}
              max={18}
              step={1}
              onChange={(mapZoom) => patch({ mapZoom })}
              format={(v) => `z${v}`}
            />
          </SettingRow>
          <SettingRow
            title="Rotate with heading"
            right={
              <Toggle
                value={settings.mapFollowsHeading}
                onChange={(mapFollowsHeading) => patch({ mapFollowsHeading })}
              />
            }
          />
        </>
      ) : null}

      <SettingRow
        title="Lean angle"
        subtitle="From the phone's accelerometer"
        right={
          <Toggle
            value={settings.showLeanAngle}
            onChange={(showLeanAngle) => patch({ showLeanAngle })}
          />
        }
      />
      {settings.showLeanAngle ? (
        <SettingRow
          title="Level the lean sensor"
          subtitle={`Current offset ${settings.leanOffsetDeg.toFixed(1)}° — hold the bike upright, then tap`}
          right={
            <Button
              label="Level"
              size="sm"
              variant="secondary"
              onPress={() => {
                const raw = imuService.currentRawRollDeg();
                if (raw != null) {
                  patch({ leanOffsetDeg: Math.round(raw * 10) / 10 });
                  imuService.setOffset(raw);
                }
              }}
            />
          }
        />
      ) : null}
      <SettingRow
        title="Trip stats"
        subtitle="Distance and moving time in the status row"
        right={
          <Toggle
            value={settings.showTripStats}
            onChange={(showTripStats) => patch({ showTripStats })}
          />
        }
      />
    </>
  );
}

/* -------------------------------------------------------------------- Bike */

function BikeSection() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const bike = useAppStore((s) => s.bike);
  const patchBike = useAppStore((s) => s.patchBike);
  const garage = useAppStore((s) => s.garage);
  const selectFromGarage = useAppStore((s) => s.selectFromGarage);
  const removeFromGarage = useAppStore((s) => s.removeFromGarage);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regenerate = useCallback(
    async (source: 'render' | 'photo') => {
      if (!bike) return;
      setError(null);
      try {
        let photoBase64: string | undefined;
        let sourcePhotoUri = bike.sourcePhotoUri;

        if (source === 'photo') {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            setError('Photo library permission is needed.');
            return;
          }
          const picked = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.9,
          });
          if (picked.canceled || !picked.assets?.length) return;
          sourcePhotoUri = await copyIntoBike(bike.id, 'source-photo', picked.assets[0].uri);
          photoBase64 = await readAsBase64(sourcePhotoUri);
        }

        setBusy('Generating artwork…');
        const outcome = await createBikeArtwork({
          bike,
          apiKey: settings.geminiApiKey,
          model: settings.geminiModel,
          mode: source === 'photo' ? 'photo-cutout' : 'render',
          angles: turntableAngles(settings.aiTurntable && source === 'render'),
          photoBase64,
          onProgress: (progress) => setBusy(progress.message),
        });

        patchBike({
          heroUri: outcome.heroUri,
          angleUris: outcome.angleUris,
          sourcePhotoUri,
          assetOrigin: outcome.origin,
        });
      } catch (err) {
        setError(describeArtworkError(err));
      } finally {
        setBusy(null);
      }
    },
    [bike, patchBike, settings.aiTurntable, settings.geminiApiKey, settings.geminiModel],
  );

  if (!bike) {
    return (
      <>
        <SectionTitle>Bike</SectionTitle>
        <SettingRow
          title="No bike set up yet"
          subtitle="Run onboarding to pick a make, model and artwork"
          right={<Button label="Set up" size="sm" onPress={() => resetTo('onboarding')} />}
        />
      </>
    );
  }

  return (
    <>
      <SectionTitle>Bike</SectionTitle>

      <SettingRow title={`${bike.year} ${bike.make} ${bike.model}`} subtitle="Tap to run setup again"
        onPress={() => resetTo('onboarding')}
        right={<Txt variant="label" size={16} dim>›</Txt>}
      />

      <SettingRow title="Artwork" subtitle={busy ?? 'Regenerate or replace the bike image'}>
        <View style={{ gap: 10 }}>
          <Panel alt style={{ alignItems: 'center', paddingVertical: 14 }}>
            {bike.heroUri ? (
              <Image
                source={{ uri: bike.heroUri }}
                style={{ width: '100%', height: 120 }}
                contentFit="contain"
              />
            ) : (
              <VectorBike size={220} />
            )}
          </Panel>
          {busy ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.accent} />
              <Txt variant="caption" dim>
                {busy}
              </Txt>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label="AI render"
                size="sm"
                variant="secondary"
                disabled={!isConfigured(settings.geminiApiKey)}
                onPress={() => void regenerate('render')}
                style={{ flex: 1 }}
              />
              <Button
                label="From photo"
                size="sm"
                variant="secondary"
                disabled={!isConfigured(settings.geminiApiKey)}
                onPress={() => void regenerate('photo')}
                style={{ flex: 1 }}
              />
              <Button
                label="Vector"
                size="sm"
                variant="ghost"
                onPress={() => {
                  deleteBikeAssets(bike.id);
                  patchBike({
                    heroUri: undefined,
                    angleUris: undefined,
                    assetOrigin: 'vector-fallback',
                  });
                }}
              />
            </View>
          )}
          {!isConfigured(settings.geminiApiKey) ? (
            <Txt variant="caption" faint>
              Add a Gemini API key below to enable AI artwork.
            </Txt>
          ) : null}
          {error ? (
            <Txt variant="caption" color={theme.colors.danger}>
              {error}
            </Txt>
          ) : null}
        </View>
      </SettingRow>

      <SettingRow title="Redline" subtitle="Where the shift lights go red">
        <Slider
          value={bike.redlineRpm}
          min={4000}
          max={18000}
          step={250}
          onChange={(redlineRpm) =>
            patchBike({ redlineRpm, maxRpm: Math.max(bike.maxRpm, redlineRpm + 500) })
          }
          format={(v) => `${v.toLocaleString()} rpm`}
        />
      </SettingRow>
      <SettingRow title="Tach full scale">
        <Slider
          value={bike.maxRpm}
          min={bike.redlineRpm + 250}
          max={20000}
          step={250}
          onChange={(maxRpm) => patchBike({ maxRpm })}
          format={(v) => `${v.toLocaleString()} rpm`}
        />
      </SettingRow>
      <SettingRow title="Speedometer full scale">
        <Slider
          value={bike.maxSpeedKph}
          min={80}
          max={320}
          step={10}
          onChange={(maxSpeedKph) => patchBike({ maxSpeedKph })}
          format={(v) => `${v} km/h`}
        />
      </SettingRow>

      {garage.length > 1 ? (
        <SettingRow title="Garage" subtitle="Switch between saved bikes">
          <View style={{ gap: 8 }}>
            {garage.map((entry) => (
              <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() => selectFromGarage(entry.id)}
                  style={{ flex: 1 }}
                  accessibilityRole="button"
                >
                  <Txt variant="body" size={14} color={entry.id === bike.id ? theme.colors.accent : theme.colors.text}>
                    {`${entry.year} ${entry.make} ${entry.model}`}
                  </Txt>
                </Pressable>
                {entry.id !== bike.id ? (
                  <Button
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      deleteBikeAssets(entry.id);
                      removeFromGarage(entry.id);
                    }}
                  />
                ) : null}
              </View>
            ))}
          </View>
        </SettingRow>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------- Data */

function DataSection() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const patch = useAppStore((s) => s.patchSettings);
  const connection = useLiveStore((s) => s.connection);
  const deviceName = useLiveStore((s) => s.deviceName);
  const devices = useLiveStore((s) => s.devices);
  const connectionError = useLiveStore((s) => s.connectionError);
  const bleLog = useLiveStore((s) => s.bleLog);
  const telemetry = useLiveStore((s) => s.telemetry);
  const [showLog, setShowLog] = useState(false);

  const connected = connection === 'connected';

  return (
    <>
      <SectionTitle>Data</SectionTitle>

      <SettingRow
        title="Speed source"
        subtitle="Auto prefers the ECU and falls back to GPS"
        right={
          <Segmented
            compact
            style={{ width: 170 }}
            value={settings.speedSource}
            onChange={(speedSource) => patch({ speedSource })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'gps', label: 'GPS' },
              { value: 'obd', label: 'OBD' },
            ]}
          />
        }
      />

      <SettingRow
        title="Bluetooth adapter"
        subtitle={
          connected
            ? `Linked to ${deviceName ?? 'adapter'}`
            : (connectionError ?? settings.lastDeviceName ?? 'Not connected')
        }
      >
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label={connection === 'scanning' ? 'Scanning…' : 'Scan'}
              size="sm"
              variant="secondary"
              disabled={connection === 'scanning'}
              onPress={() => void bleService.scan({ showAll: false })}
              style={{ flex: 1 }}
            />
            {connected ? (
              <Button
                label="Disconnect"
                size="sm"
                variant="danger"
                onPress={() => void bleService.disconnect()}
                style={{ flex: 1 }}
              />
            ) : settings.lastDeviceId ? (
              <Button
                label="Reconnect"
                size="sm"
                variant="secondary"
                onPress={() =>
                  void bleService.connect(settings.lastDeviceId!, {
                    customPids: settings.customPids,
                    pollIntervalMs: settings.pollIntervalMs,
                  })
                }
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
          {devices.map((device) => (
            <Pressable
              key={device.id}
              accessibilityRole="button"
              onPress={() =>
                void bleService
                  .connect(device.id, {
                    customPids: settings.customPids,
                    pollIntervalMs: settings.pollIntervalMs,
                  })
                  .then((ok) => {
                    if (ok) patch({ lastDeviceId: device.id, lastDeviceName: device.name });
                  })
              }
              style={{ paddingVertical: 8 }}
            >
              <Txt variant="body" size={13}>
                {device.name}
              </Txt>
              <Txt variant="mono" size={10} faint>
                {device.id}
              </Txt>
            </Pressable>
          ))}
        </View>
      </SettingRow>

      <SettingRow
        title="Reconnect automatically"
        subtitle="Links to the last adapter when the dash opens"
        right={
          <Toggle
            value={settings.autoConnectBle}
            onChange={(autoConnectBle) => patch({ autoConnectBle })}
          />
        }
      />

      <SettingRow title="Poll interval" subtitle="Lower is faster but noisier on cheap adapters">
        <Slider
          value={settings.pollIntervalMs}
          min={120}
          max={800}
          step={20}
          onChange={(pollIntervalMs) => patch({ pollIntervalMs })}
          format={(v) => `${v} ms`}
        />
      </SettingRow>

      <SettingRow
        title="Demo data"
        subtitle="Simulated ride so you can see every gauge. Always labelled DEMO."
        right={<Toggle value={settings.demoMode} onChange={(demoMode) => patch({ demoMode })} />}
      />

      <SettingRow
        title="Custom PIDs"
        subtitle="Manufacturer channels such as oil pressure or gear position"
      >
        <View style={{ gap: 8 }}>
          {settings.customPids.map((pid) => (
            <View key={pid.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="body" size={13}>
                  {`${pid.label} · ${pid.pid}`}
                </Txt>
                <Txt variant="caption" faint>
                  {`${pid.source} × ${pid.scale} + ${pid.offset} → ${pid.channel}`}
                </Txt>
              </View>
              <Button
                label="Remove"
                size="sm"
                variant="ghost"
                onPress={() =>
                  patch({ customPids: settings.customPids.filter((p) => p.id !== pid.id) })
                }
              />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {CUSTOM_PID_PRESETS.filter(
              (preset) => !settings.customPids.some((p) => p.id === preset.id),
            ).map((preset) => (
              <Button
                key={preset.id}
                label={`+ ${preset.label}`}
                size="sm"
                variant="secondary"
                onPress={() => patch({ customPids: [...settings.customPids, preset] })}
              />
            ))}
          </View>
          <Txt variant="caption" faint style={{ lineHeight: 16 }}>
            Oil pressure is not part of standard OBD-II. If your bike exposes it, add the PID here
            and the dash will show it; otherwise that tile stays dashed.
          </Txt>
        </View>
      </SettingRow>

      <SettingRow
        title="Fault codes"
        subtitle={
          telemetry.dtcCodes.length ? telemetry.dtcCodes.join(', ') : 'No stored codes reported'
        }
      />

      <SettingRow
        title="Adapter log"
        subtitle={`${bleLog.length} lines`}
        onPress={() => setShowLog((v) => !v)}
        right={
          <Txt variant="label" size={11} color={theme.colors.accent}>
            {showLog ? 'Hide' : 'Show'}
          </Txt>
        }
      >
        {showLog ? (
          <Panel alt style={{ maxHeight: 190 }}>
            <ScrollView>
              {bleLog.slice(-60).map((line, index) => (
                <Txt key={index} variant="mono" size={10} dim>
                  {line}
                </Txt>
              ))}
              {bleLog.length === 0 ? (
                <Txt variant="mono" size={10} faint>
                  Nothing yet — connect an adapter.
                </Txt>
              ) : null}
            </ScrollView>
          </Panel>
        ) : null}
      </SettingRow>
    </>
  );
}

/* ------------------------------------------------------------------ Alerts */

function AlertsSection() {
  const settings = useAppStore((s) => s.settings);
  const setThreshold = useAppStore((s) => s.setThreshold);
  const patch = useAppStore((s) => s.patchSettings);
  const t = settings.thresholds;
  const unitT = tempUnit(settings.units);

  return (
    <>
      <SectionTitle>Alerts</SectionTitle>
      <SettingRow title="Coolant warning" subtitle={`Lamp lights above this temperature`}>
        <Slider
          value={t.coolantHighC}
          min={80}
          max={130}
          step={1}
          onChange={(v) => setThreshold('coolantHighC', v)}
          format={(v) => `${settings.units === 'imperial' ? Math.round(v * 1.8 + 32) : v} ${unitT}`}
        />
      </SettingRow>
      <SettingRow title="Oil temperature warning">
        <Slider
          value={t.oilTempHighC}
          min={90}
          max={150}
          step={1}
          onChange={(v) => setThreshold('oilTempHighC', v)}
          format={(v) => `${settings.units === 'imperial' ? Math.round(v * 1.8 + 32) : v} ${unitT}`}
        />
      </SettingRow>
      <SettingRow title="Low oil pressure" subtitle="Checked only above idle">
        <Slider
          value={t.oilPressureLowBar}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(v) => setThreshold('oilPressureLowBar', v)}
          format={(v) =>
            `${settings.units === 'imperial' ? (v * 14.5038).toFixed(1) : v.toFixed(1)} ${pressureUnit(settings.units)}`
          }
        />
      </SettingRow>
      <SettingRow title="Low battery">
        <Slider
          value={t.batteryLowV}
          min={10}
          max={13}
          step={0.1}
          onChange={(v) => setThreshold('batteryLowV', v)}
          format={(v) => `${v.toFixed(1)} V`}
        />
      </SettingRow>
      <SettingRow title="Low fuel">
        <Slider
          value={t.fuelLowPct}
          min={5}
          max={40}
          step={1}
          onChange={(v) => setThreshold('fuelLowPct', v)}
          format={(v) => `${v}%`}
        />
      </SettingRow>
      <SettingRow
        title="Speed alert"
        subtitle={t.speedAlertKph == null ? 'Off' : 'Lights the speed lamp above this speed'}
        right={
          <Toggle
            value={t.speedAlertKph != null}
            onChange={(on) => setThreshold('speedAlertKph', on ? 130 : null)}
          />
        }
      >
        {t.speedAlertKph != null ? (
          <Slider
            value={t.speedAlertKph}
            min={30}
            max={300}
            step={5}
            onChange={(v) => setThreshold('speedAlertKph', v)}
            format={(v) =>
              settings.units === 'imperial'
                ? `${Math.round(v * 0.621371)} mph`
                : `${v} km/h`
            }
          />
        ) : null}
      </SettingRow>
      <SettingRow
        title="Haptic alerts"
        right={
          <Toggle value={settings.hapticAlerts} onChange={(hapticAlerts) => patch({ hapticAlerts })} />
        }
      />
      <SettingRow
        title="Keep the screen awake"
        right={<Toggle value={settings.keepAwake} onChange={(keepAwake) => patch({ keepAwake })} />}
      />
    </>
  );
}

/* ---------------------------------------------------------------------- AI */

function AiSection() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const patch = useAppStore((s) => s.patchSettings);
  const [key, setKey] = useState(settings.geminiApiKey);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');

  useEffect(() => setKey(settings.geminiApiKey), [settings.geminiApiKey]);

  return (
    <>
      <SectionTitle>AI artwork</SectionTitle>
      <SettingRow
        title="Gemini API key"
        subtitle="Stored on this device only, used just for bike artwork"
      >
        <View style={{ gap: 10 }}>
          <Field value={key} onChangeText={setKey} placeholder="AIza…" secure />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Button
              label="Save"
              size="sm"
              onPress={() => {
                patch({ geminiApiKey: key.trim() });
                setStatus('idle');
              }}
            />
            <Button
              label={status === 'checking' ? 'Checking…' : 'Test key'}
              size="sm"
              variant="secondary"
              disabled={!isConfigured(key) || status === 'checking'}
              onPress={async () => {
                setStatus('checking');
                try {
                  setStatus((await verifyApiKey(key.trim())) ? 'ok' : 'bad');
                } catch {
                  setStatus('bad');
                }
              }}
            />
            {status === 'ok' ? (
              <Txt variant="caption" color={theme.colors.success}>
                Key works
              </Txt>
            ) : null}
            {status === 'bad' ? (
              <Txt variant="caption" color={theme.colors.danger}>
                Key rejected
              </Txt>
            ) : null}
          </View>
        </View>
      </SettingRow>

      <SettingRow title="Image model">
        <View style={{ gap: 8 }}>
          {IMAGE_MODELS.map((model) => (
            <Pressable
              key={model.id}
              accessibilityRole="button"
              accessibilityState={{ selected: settings.geminiModel === model.id }}
              onPress={() => patch({ geminiModel: model.id })}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor:
                    settings.geminiModel === model.id ? theme.colors.accent : theme.colors.border,
                  backgroundColor:
                    settings.geminiModel === model.id ? theme.colors.accent : 'transparent',
                }}
              />
              <Txt variant="body" size={13} style={{ flex: 1 }}>
                {model.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </SettingRow>

      <SettingRow
        title="3D turntable"
        subtitle="Render three angles so the intro rotates real frames (3× the API cost)"
        right={
          <Toggle value={settings.aiTurntable} onChange={(aiTurntable) => patch({ aiTurntable })} />
        }
      />
    </>
  );
}

/* ------------------------------------------------------------------- Reset */

function ResetSection() {
  const theme = useTheme();
  const resetSettings = useAppStore((s) => s.resetSettings);
  const resetEverything = useAppStore((s) => s.resetEverything);
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <SettingRow
        title="Reset settings"
        subtitle="Keeps your bike and API key"
        right={<Button label="Reset" size="sm" variant="secondary" onPress={resetSettings} />}
      />
      <SettingRow
        title="Erase everything"
        subtitle="Bikes, artwork and settings"
        right={
          <Button
            label={confirm ? 'Tap to confirm' : 'Erase'}
            size="sm"
            variant="danger"
            onPress={() => {
              if (!confirm) {
                setConfirm(true);
                return;
              }
              resetEverything();
              resetTo('onboarding');
            }}
          />
        }
      />
      <Txt
        variant="caption"
        faint
        style={{ padding: theme.shape.gap, lineHeight: 16 }}
      >
        Map tiles are fetched from the provider you pick in Layout; attribution is shown on the map.
        Engine data comes from your OBD adapter and is never uploaded anywhere.
      </Txt>
    </>
  );
}
