import { lighten, mix, rgba } from '../utils/color';

import { getTheme } from './themes';
import { GaugeStyle, Theme } from './types';

export interface CustomThemeSpec {
  /** Which built-in theme the custom look inherits typography/shape/effects from. */
  baseId: string;
  name: string;
  accent: string;
  accentAlt?: string;
  /** Overrides the base theme's background when set. */
  background?: string;
  gaugeStyle?: GaugeStyle;
  glow?: number;
  scanlines?: boolean;
}

export const CUSTOM_THEME_ID = 'custom';

/**
 * Builds a full Theme from a handful of user choices. Everything the user does
 * not pick is inherited from the chosen base theme, so a custom theme is always
 * complete and always renders.
 */
export function makeCustomTheme(spec: CustomThemeSpec): Theme {
  const base = getTheme(spec.baseId);
  const accent = spec.accent || base.colors.accent;
  const accentAlt = spec.accentAlt || mix(accent, base.colors.accentAlt, 0.5);
  const bg = spec.background || base.colors.bg;

  return {
    ...base,
    id: CUSTOM_THEME_ID,
    name: spec.name?.trim() || 'Custom',
    blurb: `Custom look based on ${base.name}.`,
    generated: true,
    colors: {
      ...base.colors,
      bg,
      bgGradient: base.colors.bgGradient
        ? [lighten(bg, base.dark ? 0.08 : -0.02), bg, mix(bg, '#000000', base.dark ? 0.4 : 0)]
        : undefined,
      surface: rgba(accent, base.dark ? 0.07 : 0.06),
      surfaceAlt: rgba(accent, base.dark ? 0.13 : 0.1),
      border: rgba(accent, 0.22),
      accent,
      accentAlt,
      gaugeTrack: rgba(accent, 0.13),
      glow: accent,
      scrim: rgba(bg, 0.8),
    },
    effects: {
      ...base.effects,
      glow: spec.glow ?? base.effects.glow,
      scanlines: spec.scanlines ?? base.effects.scanlines,
    },
    gauge: {
      ...base.gauge,
      style: spec.gaugeStyle ?? base.gauge.style,
    },
  };
}
