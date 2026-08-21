import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BikeStage } from '../components/dash/BikeStage';
import { GearIndicator, LeanMeter, SpeedReadout, StatusChip, Tile } from '../components/dash/DashWidgets';
import { Gauge } from '../components/dash/Gauge';
import { MapPreview } from '../components/dash/MapPreview';
import { RpmBar } from '../components/dash/RpmBar';
import { WarningLights } from '../components/dash/WarningLights';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Txt } from '../components/ui/Txt';
import { useLayout } from '../hooks/useLayout';
import { navigate } from '../navigation/router';
import { computeWarnings } from '../services/warnings';
import { useAppStore } from '../state/appStore';
import { useLiveStore } from '../state/liveStore';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../utils/color';
import {
  EMPTY,
  clockTime,
  distanceIn,
  distanceUnit,
  duration,
  gearLabel,
  num,
  padSpeed,
  pressureIn,
  pressureUnit,
  speedIn,
  speedUnit,
  tempIn,
  tempUnit,
} from '../utils/format';

/**
 * The dash.
 *
 * Two hand-built layouts — portrait and landscape — that both fit on one screen
 * with no scrolling, because you cannot scroll a dash at 120 km/h. Everything
 * reads from the same telemetry snapshot; what changes between layouts is only
 * where things sit and how big they get.
 */
export function DashScreen({ animateBike }: { animateBike?: boolean }) {
  const theme = useTheme();
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const bike = useAppStore((s) => s.bike);

  const telemetry = useLiveStore((s) => s.telemetry);
  const available = useLiveStore((s) => s.availableChannels);
  const connection = useLiveStore((s) => s.connection);
  const transport = useLiveStore((s) => s.transport);
  const gpsReady = useLiveStore((s) => s.gpsReady);
  const trip = useLiveStore((s) => s.trip);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const units = settings.units;
  const hasEngine = transport !== 'none' && connection === 'connected';
  const warnings = useMemo(
    () => computeWarnings(telemetry, settings.thresholds, available),
    [telemetry, settings.thresholds, available],
  );

  // Buzz once when a new red lamp lights — never repeatedly while it stays lit.
  const previousDanger = useRef<string[]>([]);
  useEffect(() => {
    const danger = warnings.filter((w) => w.active && w.severity === 'danger').map((w) => w.id);
    const fresh = danger.filter((id) => !previousDanger.current.includes(id));
    previousDanger.current = danger;
    if (fresh.length && settings.hapticAlerts && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [warnings, settings.hapticAlerts]);

  const maxRpm = bike?.maxRpm ?? 12_000;
  const redlineRpm = bike?.redlineRpm ?? 10_500;
  const maxSpeed = bike?.maxSpeedKph ?? 220;
  const frames = useMemo(() => {
    if (!settings.showBike) return [];
    const list = bike?.angleUris?.length ? bike.angleUris : bike?.heroUri ? [bike.heroUri] : [];
    return list;
  }, [bike?.angleUris, bike?.heroUri, settings.showBike]);

  const speedDisplay = padSpeed(speedIn(units, telemetry.speedKph));
  const intensity = Math.min(1, (telemetry.rpm ?? 0) / Math.max(1, redlineRpm));

  const tiles = useMemo(
    () => [
      {
        label: `Coolant`,
        value: num(tempIn(units, telemetry.coolantC), 0),
        unit: tempUnit(units),
        severity: warnings.find((w) => w.id === 'coolant')?.active ? ('danger' as const) : null,
        fill: telemetry.coolantC != null ? telemetry.coolantC / 130 : null,
      },
      {
        label: 'Oil temp',
        value: num(tempIn(units, telemetry.oilTempC), 0),
        unit: tempUnit(units),
        severity: warnings.find((w) => w.id === 'oilTemp')?.active ? ('warn' as const) : null,
        fill: telemetry.oilTempC != null ? telemetry.oilTempC / 140 : null,
      },
      {
        label: 'Oil press',
        value: num(pressureIn(units, telemetry.oilPressureBar), 1),
        unit: pressureUnit(units),
        severity: warnings.find((w) => w.id === 'oilPressure')?.active ? ('danger' as const) : null,
        fill: telemetry.oilPressureBar != null ? telemetry.oilPressureBar / 6 : null,
      },
      {
        label: 'Fuel',
        value: num(telemetry.fuelPct, 0),
        unit: '%',
        severity: warnings.find((w) => w.id === 'fuel')?.active ? ('warn' as const) : null,
        fill: telemetry.fuelPct != null ? telemetry.fuelPct / 100 : null,
      },
      {
        label: 'Battery',
        value: num(telemetry.batteryV, 1),
        unit: 'V',
        severity: warnings.find((w) => w.id === 'battery')?.active ? ('warn' as const) : null,
        fill: telemetry.batteryV != null ? (telemetry.batteryV - 10) / 5 : null,
      },
      {
        label: 'Throttle',
        value: num(telemetry.throttlePct, 0),
        unit: '%',
        severity: null,
        fill: telemetry.throttlePct != null ? telemetry.throttlePct / 100 : null,
      },
      {
        label: 'Air temp',
        value: num(tempIn(units, telemetry.ambientC), 0),
        unit: tempUnit(units),
        severity: null,
        fill: null,
      },
      {
        label: 'Altitude',
        value: num(telemetry.altitudeM, 0),
        unit: 'm',
        severity: null,
        fill: null,
      },
    ],
    [telemetry, units, warnings],
  );

  const statusRow = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Txt variant="value" size={16}>
        {clockTime(now, settings.clock24h)}
      </Txt>
      <StatusChip
        label={gpsReady ? `GPS ${telemetry.gpsAccuracyM != null ? `±${Math.round(telemetry.gpsAccuracyM)}m` : ''}` : 'GPS off'}
        tone={gpsReady ? 'good' : 'warn'}
      />
      <StatusChip
        label={
          transport === 'demo'
            ? 'DEMO DATA'
            : connection === 'connected'
              ? 'ECU LINK'
              : connection === 'connecting' || connection === 'handshaking'
                ? 'LINKING…'
                : 'NO ECU'
        }
        tone={transport === 'demo' ? 'warn' : connection === 'connected' ? 'good' : 'neutral'}
      />
      {settings.showTripStats ? (
        <StatusChip
          label={`${distanceIn(units, trip.distanceKm).toFixed(1)} ${distanceUnit(units)} · ${duration(trip.movingSeconds)}`}
        />
      ) : null}
    </View>
  );

  const settingsButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      onPress={() => navigate('settings')}
      hitSlop={12}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: theme.shape.radiusSm,
        borderWidth: theme.shape.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Txt variant="label" size={14} dim>
        ⚙
      </Txt>
    </Pressable>
  );

  const dimOverlay =
    settings.brightness < 1 ? (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: rgba('#000000', (1 - settings.brightness) * 0.75),
        }}
      />
    ) : null;

  const body = layout.isLandscape ? (
    <LandscapeDash
      layout={layout}
      frames={frames}
      side={settings.bikeSide}
      bikeScale={settings.bikeScale}
      animateBike={animateBike}
      telemetry={telemetry}
      speedDisplay={speedDisplay}
      speedUnitLabel={speedUnit(units)}
      maxSpeed={speedIn(units, maxSpeed) ?? maxSpeed}
      maxRpm={maxRpm}
      redlineRpm={redlineRpm}
      hasEngine={hasEngine}
      intensity={intensity}
      tiles={tiles}
      warnings={warnings}
      statusRow={statusRow}
      settingsButton={settingsButton}
      settings={settings}
      trip={trip}
      reduceMotion={settings.animations !== 'full'}
    />
  ) : (
    <PortraitDash
      layout={layout}
      frames={frames}
      side={settings.bikeSide}
      bikeScale={settings.bikeScale}
      animateBike={animateBike}
      telemetry={telemetry}
      speedDisplay={speedDisplay}
      speedUnitLabel={speedUnit(units)}
      maxSpeed={speedIn(units, maxSpeed) ?? maxSpeed}
      maxRpm={maxRpm}
      redlineRpm={redlineRpm}
      hasEngine={hasEngine}
      intensity={intensity}
      tiles={tiles}
      warnings={warnings}
      statusRow={statusRow}
      settingsButton={settingsButton}
      settings={settings}
      trip={trip}
      reduceMotion={settings.animations !== 'full'}
    />
  );

  return (
    <ScreenBackground>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 6,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingHorizontal: Math.max(insets.left, insets.right, theme.shape.gap),
          transform: settings.hudMirror ? [{ scaleX: -1 }] : undefined,
        }}
      >
        {body}
      </View>
      {dimOverlay}
    </ScreenBackground>
  );
}

/* --------------------------------------------------------------- Portrait */

type DashSectionProps = {
  layout: ReturnType<typeof useLayout>;
  frames: string[];
  side: 'left' | 'right';
  bikeScale: number;
  animateBike?: boolean;
  telemetry: ReturnType<typeof useLiveStore.getState>['telemetry'];
  speedDisplay: string;
  speedUnitLabel: string;
  maxSpeed: number;
  maxRpm: number;
  redlineRpm: number;
  hasEngine: boolean;
  intensity: number;
  tiles: {
    label: string;
    value: string;
    unit?: string;
    severity: 'danger' | 'warn' | null;
    fill: number | null;
  }[];
  warnings: ReturnType<typeof computeWarnings>;
  statusRow: React.ReactNode;
  settingsButton: React.ReactNode;
  settings: ReturnType<typeof useAppStore.getState>['settings'];
  trip: ReturnType<typeof useLiveStore.getState>['trip'];
  reduceMotion: boolean;
};

function PortraitDash(props: DashSectionProps) {
  const theme = useTheme();
  const {
    layout,
    frames,
    side,
    bikeScale,
    animateBike,
    telemetry,
    speedDisplay,
    speedUnitLabel,
    maxSpeed,
    maxRpm,
    redlineRpm,
    hasEngine,
    intensity,
    tiles,
    warnings,
    statusRow,
    settingsButton,
    settings,
    trip,
    reduceMotion,
  } = props;

  const gaugeSize = Math.min(layout.width - theme.shape.gap * 2, layout.height * 0.4);
  const stripWidth = layout.width - theme.shape.gap * 2;
  const stageHeight = Math.max(104, layout.height * 0.22);
  const stageWidth = (layout.width - theme.shape.gap * 3) * 0.56;

  return (
    <View style={{ flex: 1, gap: theme.shape.gap }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>{statusRow}</View>
        {settingsButton}
      </View>

      <RpmBar
        rpm={telemetry.rpm}
        redlineRpm={redlineRpm}
        maxRpm={maxRpm}
        width={stripWidth}
        inactive={!hasEngine}
      />

      {/* The speedometer absorbs the slack so the cluster fills the screen. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Gauge
          value={telemetry.speedKph == null ? null : Number(speedDisplay)}
          max={Math.round(maxSpeed)}
          size={gaugeSize}
          redlineFrom={0.86}
        >
          <SpeedReadout
            value={speedDisplay}
            unit={speedUnitLabel}
            size={gaugeSize * 0.34}
            source={telemetry.speedSource ? telemetry.speedSource.toUpperCase() : null}
            dim={telemetry.speedKph == null}
          />
        </Gauge>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.shape.gap, alignItems: 'center' }}>
        <View style={{ alignItems: side === 'left' ? 'flex-start' : 'flex-end' }}>
          <BikeStage
            frames={frames}
            width={stageWidth * bikeScale}
            height={stageHeight}
            side={side}
            animateIn={animateBike}
            leanDeg={telemetry.leanDeg ?? 0}
            intensity={intensity}
            reduceMotion={reduceMotion}
          />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <GearIndicator gear={gearLabel(telemetry.gear, (telemetry.speedKph ?? 0) > 3)} size={58} />
            {settings.showLeanAngle ? (
              <LeanMeter leanDeg={telemetry.leanDeg} maxLeanDeg={trip.maxLeanDeg} size={104} />
            ) : null}
          </View>
          {settings.showMap ? (
            <MapPreview
              latitude={telemetry.latitude}
              longitude={telemetry.longitude}
              headingDeg={telemetry.headingDeg}
              zoom={settings.mapZoom}
              styleId={settings.mapStyleId}
              followHeading={settings.mapFollowsHeading}
              size={(layout.width - theme.shape.gap * 3) * 0.44}
              height={Math.max(60, stageHeight - 74)}
            />
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {tiles.slice(0, 4).map((tile) => (
          <Tile key={tile.label} {...tile} compact />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <WarningLights warnings={warnings} size={24} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------- Landscape */

function LandscapeDash(props: DashSectionProps) {
  const theme = useTheme();
  const {
    layout,
    frames,
    side,
    bikeScale,
    animateBike,
    telemetry,
    speedDisplay,
    speedUnitLabel,
    maxSpeed,
    maxRpm,
    redlineRpm,
    hasEngine,
    intensity,
    tiles,
    warnings,
    statusRow,
    settingsButton,
    settings,
    trip,
    reduceMotion,
  } = props;

  const gap = theme.shape.gap;
  const columnGap = gap;
  const usableWidth = layout.width - gap * 2 - columnGap * 2;
  const bikeColumn = usableWidth * 0.32;
  const centerColumn = usableWidth * 0.4;
  const rightColumn = usableWidth * 0.28;
  const gaugeSize = Math.min(centerColumn, layout.height * 0.52);
  const stageHeight = layout.height * (settings.showMap ? 0.46 : 0.72);

  const bikePanel = (
    <View style={{ width: bikeColumn, gap }}>
      <BikeStage
        frames={frames}
        width={bikeColumn * bikeScale}
        height={stageHeight}
        side={side}
        animateIn={animateBike}
        leanDeg={telemetry.leanDeg ?? 0}
        intensity={intensity}
        reduceMotion={reduceMotion}
      />
      {settings.showMap ? (
        <MapPreview
          latitude={telemetry.latitude}
          longitude={telemetry.longitude}
          headingDeg={telemetry.headingDeg}
          zoom={settings.mapZoom}
          styleId={settings.mapStyleId}
          followHeading={settings.mapFollowsHeading}
          size={bikeColumn}
          height={layout.height * 0.3}
        />
      ) : null}
    </View>
  );

  const centerPanel = (
    <View style={{ width: centerColumn, alignItems: 'center', justifyContent: 'space-between' }}>
      <RpmBar
        rpm={telemetry.rpm}
        redlineRpm={redlineRpm}
        maxRpm={maxRpm}
        width={centerColumn}
        inactive={!hasEngine}
      />
      <Gauge
        value={telemetry.speedKph == null ? null : Number(speedDisplay)}
        max={Math.round(maxSpeed)}
        size={gaugeSize}
        redlineFrom={0.86}
      >
        <SpeedReadout
          value={speedDisplay}
          unit={speedUnitLabel}
          size={gaugeSize * 0.36}
          source={telemetry.speedSource ? telemetry.speedSource.toUpperCase() : null}
          dim={telemetry.speedKph == null}
        />
      </Gauge>
      <View style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
        <GearIndicator gear={gearLabel(telemetry.gear, (telemetry.speedKph ?? 0) > 3)} size={56} />
        {settings.showLeanAngle ? (
          <LeanMeter leanDeg={telemetry.leanDeg} maxLeanDeg={trip.maxLeanDeg} size={96} />
        ) : null}
      </View>
    </View>
  );

  const rightPanel = (
    <View style={{ width: rightColumn, gap: 6, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>{statusRow}</View>
        {settingsButton}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {tiles.map((tile) => (
          <Tile
            key={tile.label}
            {...tile}
            compact
            style={{ width: (rightColumn - 6) / 2, flexGrow: 0, flexBasis: 'auto' }}
          />
        ))}
      </View>

      <WarningLights warnings={warnings} size={24} />
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: columnGap }}>
      {side === 'left' ? bikePanel : rightPanel}
      {centerPanel}
      {side === 'left' ? rightPanel : bikePanel}
    </View>
  );
}

export const DASH_EMPTY = EMPTY;
