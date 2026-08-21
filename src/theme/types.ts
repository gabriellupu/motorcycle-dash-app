/**
 * Theme contract for the dash.
 *
 * Every visual decision the dash makes is read from a Theme object, so adding a
 * new look means adding one more entry to the registry in `themes.ts` (or
 * calling `registerTheme()` at runtime) — no screen or component needs editing.
 */

export type ThemeId = string;

export interface ThemeColors {
  /** Page background. */
  bg: string;
  /** Optional 2/3-stop background gradient painted on top of `bg`. */
  bgGradient?: string[];
  /** Panel / card fill. */
  surface: string;
  /** Secondary panel fill (tiles, wells). */
  surfaceAlt: string;
  /** Hairlines, dividers, gauge frames. */
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  /** Primary brand/accent — needles, active arcs, focus rings. */
  accent: string;
  /** Secondary accent used for gradients and the RPM sweep. */
  accentAlt: string;
  success: string;
  warn: string;
  danger: string;
  /** Unfilled part of a gauge. */
  gaugeTrack: string;
  /** Redline zone on the tach. */
  redline: string;
  /** Colour of glows / bloom when `effects.glow > 0`. */
  glow: string;
  /** Tint laid over the map tiles so they sit inside the theme. */
  mapTint: string;
  /** Dim layer used behind modals and the shutdown fade. */
  scrim: string;
}

export interface ThemeTypography {
  /** Family used for headings and labels. */
  display: string;
  /** Family used for numeric readouts (speed, RPM, temps). */
  digits: string;
  /** Family used for dense technical text. */
  mono: string;
  /** Weight applied to the big speed readout. */
  digitWeight:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  labelWeight: 'normal' | 'bold' | '500' | '600' | '700' | '800';
  /** Tracking for small uppercase labels. */
  labelTracking: number;
  /** Tracking for the big numerals (negative tightens a wide face). */
  digitTracking: number;
  uppercaseLabels: boolean;
}

export interface ThemeShape {
  radius: number;
  radiusSm: number;
  borderWidth: number;
  /** Global spacing unit in px. */
  gap: number;
}

export interface ThemeEffects {
  /** Frosted panels (expo-blur) — costs a little GPU. */
  blur: boolean;
  /** 0 = flat, 1 = heavy bloom around gauges and numerals. */
  glow: number;
  /** CRT scanline overlay. */
  scanlines: boolean;
  /** 0..1 film-grain / noise opacity. */
  grain: number;
  /** Vignette strength 0..1. */
  vignette: number;
  /** Sweep of light across panels on mount. */
  sheen: boolean;
}

export type GaugeStyle = 'arc' | 'segments' | 'analog' | 'bar';

export interface ThemeGauge {
  style: GaugeStyle;
  /** Total sweep of the speed/tach arc in degrees. */
  sweepDeg: number;
  /** Where the sweep starts, degrees clockwise from 12 o'clock. */
  startDeg: number;
  thickness: number;
  ticks: boolean;
  tickLabels: boolean;
  /** Draw a needle in addition to the fill. */
  needle: boolean;
  /** Segment count when style === 'segments'. */
  segments: number;
}

export interface Theme {
  id: ThemeId;
  name: string;
  blurb: string;
  dark: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  shape: ThemeShape;
  effects: ThemeEffects;
  gauge: ThemeGauge;
  /** Set for themes generated from the custom-theme editor. */
  generated?: boolean;
}
