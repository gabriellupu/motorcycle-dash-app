import { create } from 'zustand';

import {
  ConnectionState,
  DiscoveredDevice,
  Telemetry,
  TripStats,
  emptyTelemetry,
} from './types';

export type TransportKind = 'none' | 'ble' | 'demo';

export interface LiveState {
  telemetry: Telemetry;
  /** Set of channels the current transport actually provides. */
  availableChannels: Set<keyof Telemetry>;

  connection: ConnectionState;
  transport: TransportKind;
  deviceName: string | null;
  deviceId: string | null;
  connectionError: string | null;
  devices: DiscoveredDevice[];
  /** Raw ELM327 traffic, newest last — shown in Settings > Diagnostics. */
  bleLog: string[];

  gpsReady: boolean;
  gpsError: string | null;

  trip: TripStats;

  ingest: (patch: Partial<Telemetry>, channels?: (keyof Telemetry)[]) => void;
  ingestGps: (patch: Partial<Telemetry>) => void;
  setConnection: (state: ConnectionState, extra?: Partial<LiveState>) => void;
  setTransport: (transport: TransportKind, deviceName?: string | null, deviceId?: string | null) => void;
  setDevices: (devices: DiscoveredDevice[]) => void;
  pushBleLog: (line: string) => void;
  setGps: (ready: boolean, error?: string | null) => void;
  resetTrip: () => void;
  resetTelemetry: () => void;
}

const newTrip = (): TripStats => ({
  startedAt: Date.now(),
  distanceKm: 0,
  maxSpeedKph: 0,
  maxLeanDeg: 0,
  movingSeconds: 0,
});

export const useLiveStore = create<LiveState>()((set, get) => ({
  telemetry: emptyTelemetry,
  availableChannels: new Set<keyof Telemetry>(),

  connection: 'idle',
  transport: 'none',
  deviceName: null,
  deviceId: null,
  connectionError: null,
  devices: [],
  bleLog: [],

  gpsReady: false,
  gpsError: null,

  trip: newTrip(),

  ingest: (patch, channels) => {
    const prev = get().telemetry;
    const next: Telemetry = { ...prev, ...patch, updatedAt: Date.now() };
    const trip = updateTrip(get().trip, prev, next);
    if (channels?.length) {
      const available = new Set(get().availableChannels);
      channels.forEach((c) => available.add(c));
      set({ telemetry: next, trip, availableChannels: available });
    } else {
      set({ telemetry: next, trip });
    }
  },

  ingestGps: (patch) => {
    const prev = get().telemetry;
    // OBD speed wins when the ECU is streaming it; GPS fills every other field.
    const obdSpeedFresh =
      prev.speedSource === 'obd' && Date.now() - prev.updatedAt < 2500 && patch.speedKph != null;
    const merged: Partial<Telemetry> = obdSpeedFresh
      ? { ...patch, speedKph: prev.speedKph, speedSource: prev.speedSource }
      : patch;
    get().ingest(merged);
  },

  setConnection: (connection, extra) => set({ connection, ...(extra ?? {}) }),
  setTransport: (transport, deviceName = null, deviceId = null) =>
    set({ transport, deviceName, deviceId }),
  setDevices: (devices) => set({ devices }),
  pushBleLog: (line) => set({ bleLog: [...get().bleLog, line].slice(-200) }),
  setGps: (gpsReady, gpsError = null) => set({ gpsReady, gpsError }),
  resetTrip: () => set({ trip: newTrip() }),
  resetTelemetry: () =>
    set({ telemetry: emptyTelemetry, availableChannels: new Set<keyof Telemetry>() }),
}));

function updateTrip(trip: TripStats, prev: Telemetry, next: Telemetry): TripStats {
  const dtMs = prev.updatedAt ? next.updatedAt - prev.updatedAt : 0;
  if (dtMs <= 0 || dtMs > 10_000) return trip;
  const speed = next.speedKph ?? 0;
  const dtH = dtMs / 3_600_000;
  const moving = speed > 3;
  return {
    ...trip,
    distanceKm: trip.distanceKm + (moving ? speed * dtH : 0),
    maxSpeedKph: Math.max(trip.maxSpeedKph, speed),
    maxLeanDeg: Math.max(trip.maxLeanDeg, Math.abs(next.leanDeg ?? 0)),
    movingSeconds: trip.movingSeconds + (moving ? dtMs / 1000 : 0),
  };
}

/** True when the transport is expected to deliver engine-side channels. */
export function hasEngineData(state: LiveState): boolean {
  return state.transport !== 'none' && state.connection === 'connected';
}
