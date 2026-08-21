import type { CarBodyStyle, VehicleType } from '../data/vehicles';
import type { CustomPidSpec } from '../services/ble/obd';
import type { CustomThemeSpec } from '../theme/custom';

export type Units = 'metric' | 'imperial';

/**
 * The angles a vehicle is photographed from. `side` is the hero shot the dash
 * renders; the rest sharpen the AI's picture of a customised vehicle and feed
 * the 3D turntable intro.
 */
export type VehicleAngle = 'side' | 'frontQuarter' | 'front' | 'rearQuarter' | 'rear';

export interface VehiclePhoto {
  angle: VehicleAngle;
  /** The rider's original photo, copied into the vehicle's folder. */
  sourceUri: string;
  /** Transparent cut-out produced from it, once processed. */
  assetUri?: string;
  /** Set when processing this angle failed, so the UI can explain and retry. */
  error?: string;
}

export interface VehicleProfile {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  nickname?: string;
  displacementCc?: number;
  bodyStyle?: CarBodyStyle;
  /** Colour/modification notes the rider typed; passed to the AI prompt. */
  colorHint?: string;
  /** Tach full-scale and redline, used to scale the RPM gauge. */
  redlineRpm: number;
  maxRpm: number;
  /** Full-scale of the speedometer. */
  maxSpeedKph: number;
  /** Main cut-out used on the dash (file://). */
  heroUri?: string;
  /** Turntable frames for the intro, ordered front -> side. */
  angleUris?: string[];
  /** Captured originals and their cut-outs, one per angle. */
  photos: VehiclePhoto[];
  assetOrigin?: 'ai-generated' | 'ai-cutout' | 'vector-fallback';
  /** Sampled from the artwork; used as the accent for the auto theme tint. */
  accentColor?: string;
  createdAt: number;
}

/** True for battery-electric vehicles, which have no tach to show. */
export function isElectricProfile(vehicle: Pick<VehicleProfile, 'displacementCc'> | null): boolean {
  return vehicle?.displacementCc === 0;
}

export type ThemeChoice = string;

export interface WarningThresholds {
  coolantHighC: number;
  oilTempHighC: number;
  oilPressureLowBar: number;
  batteryLowV: number;
  fuelLowPct: number;
  speedAlertKph: number | null;
}

export interface Settings {
  themeId: ThemeChoice;
  customTheme: CustomThemeSpec | null;
  units: Units;
  clock24h: boolean;

  /** Which side of the screen the vehicle is docked on. */
  vehicleSide: 'left' | 'right';
  vehicleScale: number;
  showVehicle: boolean;

  showMap: boolean;
  mapStyleId: string;
  mapZoom: number;
  mapFollowsHeading: boolean;

  speedSource: 'auto' | 'gps' | 'obd';
  /** Zero-point for the lean-angle sensor, captured with the bike upright. */
  leanOffsetDeg: number;
  showLeanAngle: boolean;
  showGForce: boolean;
  showTripStats: boolean;

  keepAwake: boolean;
  orientationLock: 'auto' | 'portrait' | 'landscape';
  brightness: number;
  hudMirror: boolean;
  hapticAlerts: boolean;
  animations: 'full' | 'reduced' | 'off';
  startupSequence: boolean;

  autoConnectBle: boolean;
  lastDeviceId: string | null;
  lastDeviceName: string | null;
  demoMode: boolean;
  /** Manufacturer PIDs the rider added (oil pressure, gear, …). */
  customPids: CustomPidSpec[];
  pollIntervalMs: number;

  geminiApiKey: string;
  geminiModel: string;
  aiTurntable: boolean;

  thresholds: WarningThresholds;
  onboarded: boolean;
}

export type ConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'handshaking'
  | 'connected'
  | 'error';

export interface DiscoveredDevice {
  id: string;
  name: string;
  rssi: number | null;
}

export interface Telemetry {
  /** km/h — merged from OBD when available, GPS otherwise. */
  speedKph: number | null;
  speedSource: 'gps' | 'obd' | 'demo' | null;
  rpm: number | null;
  gear: number | null;
  throttlePct: number | null;
  engineLoadPct: number | null;
  coolantC: number | null;
  oilTempC: number | null;
  oilPressureBar: number | null;
  fuelPct: number | null;
  fuelRateLph: number | null;
  intakeC: number | null;
  ambientC: number | null;
  batteryV: number | null;
  /** Malfunction indicator lamp. */
  mil: boolean;
  dtcCodes: string[];
  /** Degrees, from the device IMU, negative = left. */
  leanDeg: number | null;
  gLat: number | null;
  gLon: number | null;
  headingDeg: number | null;
  altitudeM: number | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyM: number | null;
  odoTripKm: number;
  updatedAt: number;
}

export const emptyTelemetry: Telemetry = {
  speedKph: null,
  speedSource: null,
  rpm: null,
  gear: null,
  throttlePct: null,
  engineLoadPct: null,
  coolantC: null,
  oilTempC: null,
  oilPressureBar: null,
  fuelPct: null,
  fuelRateLph: null,
  intakeC: null,
  ambientC: null,
  batteryV: null,
  mil: false,
  dtcCodes: [],
  leanDeg: null,
  gLat: null,
  gLon: null,
  headingDeg: null,
  altitudeM: null,
  latitude: null,
  longitude: null,
  gpsAccuracyM: null,
  odoTripKm: 0,
  updatedAt: 0,
};

export interface TripStats {
  startedAt: number;
  distanceKm: number;
  maxSpeedKph: number;
  maxLeanDeg: number;
  movingSeconds: number;
}
