import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_MAP_STYLE_ID } from '../services/map/tiles';
import { CUSTOM_THEME_ID, CustomThemeSpec, makeCustomTheme } from '../theme/custom';
import { DEFAULT_THEME_ID, getTheme, registerTheme } from '../theme/themes';
import { Theme } from '../theme/types';

import { BikeProfile, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  customTheme: null,
  units: 'metric',
  clock24h: true,

  bikeSide: 'left',
  bikeScale: 1,
  showBike: true,

  showMap: true,
  mapStyleId: DEFAULT_MAP_STYLE_ID,
  mapZoom: 15,
  mapFollowsHeading: true,

  speedSource: 'auto',
  leanOffsetDeg: 0,
  showLeanAngle: true,
  showGForce: false,
  showTripStats: true,

  keepAwake: true,
  orientationLock: 'auto',
  brightness: 1,
  hudMirror: false,
  hapticAlerts: true,
  animations: 'full',
  startupSequence: true,

  autoConnectBle: true,
  lastDeviceId: null,
  lastDeviceName: null,
  demoMode: false,
  customPids: [],
  pollIntervalMs: 220,

  geminiApiKey: '',
  geminiModel: 'gemini-3.1-flash-image',
  aiTurntable: false,

  thresholds: {
    coolantHighC: 110,
    oilTempHighC: 125,
    oilPressureLowBar: 0.8,
    batteryLowV: 11.8,
    fuelLowPct: 12,
    speedAlertKph: null,
  },
  onboarded: false,
};

interface AppState {
  settings: Settings;
  bike: BikeProfile | null;
  garage: BikeProfile[];
  hydrated: boolean;

  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  setThreshold: <K extends keyof Settings['thresholds']>(
    key: K,
    value: Settings['thresholds'][K],
  ) => void;
  resetSettings: () => void;

  setBike: (bike: BikeProfile | null) => void;
  patchBike: (patch: Partial<BikeProfile>) => void;
  saveToGarage: (bike: BikeProfile) => void;
  removeFromGarage: (id: string) => void;
  selectFromGarage: (id: string) => void;

  applyCustomTheme: (spec: CustomThemeSpec) => void;
  completeOnboarding: () => void;
  resetEverything: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      bike: null,
      garage: [],
      hydrated: false,

      setSetting: (key, value) => set({ settings: { ...get().settings, [key]: value } }),
      patchSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setThreshold: (key, value) =>
        set({
          settings: {
            ...get().settings,
            thresholds: { ...get().settings.thresholds, [key]: value },
          },
        }),
      resetSettings: () =>
        set({
          settings: {
            ...DEFAULT_SETTINGS,
            onboarded: get().settings.onboarded,
            geminiApiKey: get().settings.geminiApiKey,
          },
        }),

      setBike: (bike) => set({ bike }),
      patchBike: (patch) => {
        const current = get().bike;
        if (!current) return;
        const next = { ...current, ...patch };
        set({
          bike: next,
          garage: get().garage.map((b) => (b.id === next.id ? next : b)),
        });
      },
      saveToGarage: (bike) => {
        const rest = get().garage.filter((b) => b.id !== bike.id);
        set({ garage: [bike, ...rest].slice(0, 12), bike });
      },
      removeFromGarage: (id) => {
        const garage = get().garage.filter((b) => b.id !== id);
        const bike = get().bike?.id === id ? (garage[0] ?? null) : get().bike;
        set({ garage, bike });
      },
      selectFromGarage: (id) => {
        const found = get().garage.find((b) => b.id === id);
        if (found) set({ bike: found });
      },

      applyCustomTheme: (spec) => {
        registerTheme(makeCustomTheme(spec));
        set({ settings: { ...get().settings, customTheme: spec, themeId: CUSTOM_THEME_ID } });
      },
      completeOnboarding: () => set({ settings: { ...get().settings, onboarded: true } }),
      resetEverything: () => set({ settings: DEFAULT_SETTINGS, bike: null, garage: [] }),
    }),
    {
      name: 'moto-dash/app-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        bike: state.bike,
        garage: state.garage,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...saved,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(saved.settings ?? {}),
            thresholds: {
              ...DEFAULT_SETTINGS.thresholds,
              ...(saved.settings?.thresholds ?? {}),
            },
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        // Custom themes live in the registry, which is rebuilt on every launch.
        if (state?.settings.customTheme) {
          registerTheme(makeCustomTheme(state.settings.customTheme));
        }
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Resolved theme for the current settings. */
export function selectTheme(state: AppState): Theme {
  return getTheme(state.settings.themeId);
}

export const useSettings = () => useAppStore((s) => s.settings);
export const useBike = () => useAppStore((s) => s.bike);
