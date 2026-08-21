import { Platform } from 'react-native';

import { Theme, ThemeId } from './types';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' })!;
const SYSTEM = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!;
const SYSTEM_CONDENSED = Platform.select({
  ios: 'System',
  android: 'sans-serif-condensed',
  default: 'System',
})!;

/**
 * ULTRA-MODERN — deep space black, electric cyan, glass panels, bloom.
 */
const ultramodern: Theme = {
  id: 'ultramodern',
  name: 'Ultra Modern',
  blurb: 'Glass, bloom and electric cyan. The hypernaked look.',
  dark: true,
  colors: {
    bg: '#04070E',
    bgGradient: ['#0B1430', '#05080F', '#02040A'],
    surface: 'rgba(140,180,255,0.07)',
    surfaceAlt: 'rgba(140,180,255,0.12)',
    border: 'rgba(140,190,255,0.18)',
    text: '#EAF3FF',
    textDim: 'rgba(200,222,255,0.62)',
    textFaint: 'rgba(180,205,255,0.30)',
    accent: '#3BE8FF',
    accentAlt: '#7B5BFF',
    success: '#37E39B',
    warn: '#FFC24B',
    danger: '#FF4D6D',
    gaugeTrack: 'rgba(120,170,255,0.13)',
    redline: '#FF3B5C',
    glow: '#3BE8FF',
    mapTint: 'rgba(10,25,60,0.45)',
    scrim: 'rgba(2,4,10,0.72)',
  },
  typography: {
    display: SYSTEM,
    digits: SYSTEM,
    mono: MONO,
    digitWeight: '200',
    labelWeight: '600',
    labelTracking: 2.4,
    digitTracking: -4,
    uppercaseLabels: true,
  },
  shape: { radius: 26, radiusSm: 14, borderWidth: 1, gap: 12 },
  effects: { blur: true, glow: 1, scanlines: false, grain: 0, vignette: 0.55, sheen: true },
  gauge: {
    style: 'arc',
    sweepDeg: 250,
    startDeg: 235,
    thickness: 12,
    ticks: true,
    tickLabels: true,
    needle: false,
    segments: 40,
  },
};

/**
 * MINIMAL — near-monochrome, no chrome, one enormous number.
 */
const minimal: Theme = {
  id: 'minimal',
  name: 'Minimal',
  blurb: 'One huge number. Nothing you did not ask for.',
  dark: true,
  colors: {
    bg: '#000000',
    surface: 'rgba(255,255,255,0.04)',
    surfaceAlt: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    textDim: 'rgba(255,255,255,0.55)',
    textFaint: 'rgba(255,255,255,0.24)',
    accent: '#FFFFFF',
    accentAlt: '#9BA3AF',
    success: '#8DF0B4',
    warn: '#F5D07A',
    danger: '#FF6B6B',
    gaugeTrack: 'rgba(255,255,255,0.10)',
    redline: '#FF6B6B',
    glow: '#FFFFFF',
    mapTint: 'rgba(0,0,0,0.55)',
    scrim: 'rgba(0,0,0,0.8)',
  },
  typography: {
    display: SYSTEM,
    digits: SYSTEM,
    mono: MONO,
    digitWeight: '100',
    labelWeight: '500',
    labelTracking: 3,
    digitTracking: -6,
    uppercaseLabels: true,
  },
  shape: { radius: 4, radiusSm: 2, borderWidth: 1, gap: 14 },
  effects: { blur: false, glow: 0, scanlines: false, grain: 0, vignette: 0.2, sheen: false },
  gauge: {
    style: 'bar',
    sweepDeg: 180,
    startDeg: 270,
    thickness: 4,
    ticks: false,
    tickLabels: false,
    needle: false,
    segments: 24,
  },
};

/**
 * TECHNICAL — instrumentation. Monospace, wireframe, every value on screen.
 */
const technical: Theme = {
  id: 'technical',
  name: 'Technical',
  blurb: 'Telemetry-first. Monospace, segments, every channel visible.',
  dark: true,
  colors: {
    bg: '#070A0C',
    bgGradient: ['#0A1013', '#06090B'],
    surface: 'rgba(0,255,190,0.045)',
    surfaceAlt: 'rgba(0,255,190,0.09)',
    border: 'rgba(0,255,190,0.22)',
    text: '#D8FFF4',
    textDim: 'rgba(150,255,225,0.6)',
    textFaint: 'rgba(120,220,195,0.28)',
    accent: '#00FFC2',
    accentAlt: '#00A3FF',
    success: '#00FFC2',
    warn: '#FFD400',
    danger: '#FF3B30',
    gaugeTrack: 'rgba(0,255,190,0.12)',
    redline: '#FF3B30',
    glow: '#00FFC2',
    mapTint: 'rgba(0,40,32,0.5)',
    scrim: 'rgba(3,8,8,0.8)',
  },
  typography: {
    display: MONO,
    digits: MONO,
    mono: MONO,
    digitWeight: '700',
    labelWeight: '700',
    labelTracking: 1.6,
    digitTracking: -1,
    uppercaseLabels: true,
  },
  shape: { radius: 3, radiusSm: 2, borderWidth: 1, gap: 8 },
  effects: { blur: false, glow: 0.5, scanlines: false, grain: 0.03, vignette: 0.3, sheen: false },
  gauge: {
    style: 'segments',
    sweepDeg: 270,
    startDeg: 225,
    thickness: 16,
    ticks: true,
    tickLabels: true,
    needle: false,
    segments: 36,
  },
};

/**
 * RETRO — 1980s amber gauge cluster: analog needles, warm glass, scanlines.
 */
const retro: Theme = {
  id: 'retro',
  name: 'Retro',
  blurb: 'Amber cluster, analog needles, a little CRT dust.',
  dark: true,
  colors: {
    bg: '#120C06',
    bgGradient: ['#231607', '#120C06', '#0A0603'],
    surface: 'rgba(255,176,60,0.07)',
    surfaceAlt: 'rgba(255,176,60,0.13)',
    border: 'rgba(255,176,60,0.28)',
    text: '#FFD9A0',
    textDim: 'rgba(255,190,120,0.66)',
    textFaint: 'rgba(255,180,110,0.3)',
    accent: '#FFA22B',
    accentAlt: '#FF5F1F',
    success: '#9BE564',
    warn: '#FFD400',
    danger: '#FF4530',
    gaugeTrack: 'rgba(255,160,50,0.14)',
    redline: '#FF4530',
    glow: '#FF9A1F',
    mapTint: 'rgba(60,30,0,0.5)',
    scrim: 'rgba(15,8,2,0.8)',
  },
  typography: {
    display: SERIF,
    digits: SYSTEM_CONDENSED,
    mono: MONO,
    digitWeight: '700',
    labelWeight: '700',
    labelTracking: 2,
    digitTracking: -2,
    uppercaseLabels: true,
  },
  shape: { radius: 18, radiusSm: 10, borderWidth: 2, gap: 10 },
  effects: { blur: false, glow: 0.85, scanlines: true, grain: 0.08, vignette: 0.7, sheen: false },
  gauge: {
    style: 'analog',
    sweepDeg: 240,
    startDeg: 240,
    thickness: 10,
    ticks: true,
    tickLabels: true,
    needle: true,
    segments: 24,
  },
};

/**
 * DAYLIGHT — high-contrast light theme for riding in the sun.
 */
const daylight: Theme = {
  id: 'daylight',
  name: 'Daylight',
  blurb: 'High-contrast light cluster for bright sun.',
  dark: false,
  colors: {
    bg: '#F2F4F7',
    bgGradient: ['#FFFFFF', '#E8ECF2'],
    surface: 'rgba(10,20,40,0.05)',
    surfaceAlt: 'rgba(10,20,40,0.09)',
    border: 'rgba(10,20,40,0.16)',
    text: '#0B1220',
    textDim: 'rgba(11,18,32,0.62)',
    textFaint: 'rgba(11,18,32,0.32)',
    accent: '#0B63FF',
    accentAlt: '#00A6A6',
    success: '#0E9F6E',
    warn: '#B7791F',
    danger: '#D92D20',
    gaugeTrack: 'rgba(11,18,32,0.12)',
    redline: '#D92D20',
    glow: 'transparent',
    mapTint: 'rgba(255,255,255,0.25)',
    scrim: 'rgba(240,243,247,0.86)',
  },
  typography: {
    display: SYSTEM,
    digits: SYSTEM,
    mono: MONO,
    digitWeight: '300',
    labelWeight: '700',
    labelTracking: 2,
    digitTracking: -4,
    uppercaseLabels: true,
  },
  shape: { radius: 20, radiusSm: 12, borderWidth: 1, gap: 12 },
  effects: { blur: false, glow: 0, scanlines: false, grain: 0, vignette: 0.12, sheen: false },
  gauge: {
    style: 'arc',
    sweepDeg: 250,
    startDeg: 235,
    thickness: 12,
    ticks: true,
    tickLabels: true,
    needle: false,
    segments: 40,
  },
};

const BUILT_IN: Theme[] = [ultramodern, minimal, technical, retro, daylight];

const registry = new Map<ThemeId, Theme>(BUILT_IN.map((t) => [t.id, t]));

/** Add a theme at runtime (custom themes, future packs, plugins). */
export function registerTheme(theme: Theme): void {
  registry.set(theme.id, theme);
}

export function unregisterTheme(id: ThemeId): void {
  if (BUILT_IN.some((t) => t.id === id)) return;
  registry.delete(id);
}

export function listThemes(): Theme[] {
  return [...registry.values()];
}

export function getTheme(id: ThemeId | undefined): Theme {
  return (id && registry.get(id)) || ultramodern;
}

export const DEFAULT_THEME_ID = ultramodern.id;
export { ultramodern, minimal, technical, retro, daylight };
