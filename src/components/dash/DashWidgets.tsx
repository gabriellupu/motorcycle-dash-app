import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Severity } from '../../services/warnings';
import { useTheme } from '../../theme/ThemeProvider';
import { EMPTY } from '../../utils/format';
import { rgba } from '../../utils/color';
import { Panel } from '../ui/Panel';
import { Txt } from '../ui/Txt';

/* -------------------------------------------------------------------- Tile */

export interface TileProps {
  label: string;
  value: string;
  unit?: string;
  severity?: Severity | null;
  /** 0..1 fill for the mini bar; omit for a plain readout. */
  fill?: number | null;
  style?: ViewStyle;
  compact?: boolean;
}

/** One telemetry channel. Missing data reads as '—', never as a hidden tile. */
export function Tile({ label, value, unit, severity, fill, style, compact }: TileProps) {
  const theme = useTheme();
  const missing = value === EMPTY;
  const color =
    severity === 'danger'
      ? theme.colors.danger
      : severity === 'warn'
        ? theme.colors.warn
        : missing
          ? theme.colors.textFaint
          : theme.colors.text;

  return (
    <Panel style={[{ flex: 1, minWidth: 84, justifyContent: 'space-between' }, style]} padded>
      <Txt variant="label" size={compact ? 9 : 10} faint={missing} dim numberOfLines={1}>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Txt variant="value" size={compact ? 20 : 26} color={color} numberOfLines={1}>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="label" size={compact ? 8 : 9} faint>
            {unit}
          </Txt>
        ) : null}
      </View>
      {fill != null ? (
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: theme.colors.gaugeTrack,
            marginTop: 6,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 3,
              width: `${Math.max(0, Math.min(1, fill)) * 100}%`,
              backgroundColor: color,
            }}
          />
        </View>
      ) : null}
    </Panel>
  );
}

/* ------------------------------------------------------------ SpeedReadout */

export function SpeedReadout({
  value,
  unit,
  size,
  source,
  dim,
}: {
  value: string;
  unit: string;
  size: number;
  source?: string | null;
  dim?: boolean;
}) {
  const theme = useTheme();
  const placeholder = value === EMPTY;
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt
        variant="value"
        size={placeholder ? size * 0.5 : size}
        color={dim ? theme.colors.textDim : theme.colors.text}
        style={{
          letterSpacing: theme.typography.digitTracking,
          textShadowColor: rgba(theme.colors.glow, theme.effects.glow * 0.28),
          textShadowRadius: theme.effects.glow * 9,
          textShadowOffset: { width: 0, height: 0 },
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -size * 0.06 }}>
        <Txt variant="label" size={Math.max(10, size * 0.09)} dim>
          {unit}
        </Txt>
        {source ? (
          <Txt variant="label" size={Math.max(8, size * 0.06)} faint>
            {source}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------- GearIndicator */

export function GearIndicator({ gear, size = 64 }: { gear: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.shape.radius,
        borderWidth: theme.shape.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt variant="label" size={8} faint style={{ position: 'absolute', top: 6 }}>
        Gear
      </Txt>
      <Txt
        variant="value"
        size={size * 0.62}
        color={gear === 'N' ? theme.colors.success : theme.colors.text}
      >
        {gear}
      </Txt>
    </View>
  );
}

/* --------------------------------------------------------------- LeanMeter */

export function LeanMeter({
  leanDeg,
  maxLeanDeg,
  size = 120,
}: {
  leanDeg: number | null;
  maxLeanDeg: number;
  size?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(-60, Math.min(60, leanDeg ?? 0));
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;

  const point = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const horizon = point(clamped, r);
  const opposite = point(clamped + 180, r);
  const peakLeft = point(-Math.abs(maxLeanDeg), r);
  const peakRight = point(Math.abs(maxLeanDeg), r);

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      {/* Only the top half of the dial is shown — a horizon, not a clock. */}
      <View style={{ width: size, height: size / 2 + 4, overflow: 'hidden' }}>
        <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={theme.colors.gaugeTrack} strokeWidth={2} fill="none" />
        {[-45, -30, -15, 0, 15, 30, 45].map((deg) => {
          const a = point(deg, r);
          const b = point(deg, r - (deg === 0 ? 12 : 7));
          return (
            <Line
              key={deg}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={deg === 0 ? theme.colors.textDim : theme.colors.textFaint}
              strokeWidth={deg === 0 ? 2 : 1}
            />
          );
        })}
        <Line
          x1={opposite.x}
          y1={opposite.y}
          x2={horizon.x}
          y2={horizon.y}
          stroke={theme.colors.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={3} fill={theme.colors.accent} />
        <Path
          d={`M ${peakLeft.x} ${peakLeft.y} l 0 0`}
          stroke={theme.colors.warn}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Path
          d={`M ${peakRight.x} ${peakRight.y} l 0 0`}
          stroke={theme.colors.warn}
          strokeWidth={5}
          strokeLinecap="round"
        />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', marginTop: 2 }}>
        <Txt variant="value" size={18}>
          {leanDeg == null ? EMPTY : `${Math.abs(Math.round(leanDeg))}°`}
        </Txt>
        <Txt variant="label" size={8} faint>
          {leanDeg == null ? 'Lean' : leanDeg < -1 ? 'Left' : leanDeg > 1 ? 'Right' : 'Level'}
        </Txt>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------- StatusChip */

export function StatusChip({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  icon?: React.ReactNode;
}) {
  const theme = useTheme();
  const color =
    tone === 'good'
      ? theme.colors.success
      : tone === 'warn'
        ? theme.colors.warn
        : tone === 'bad'
          ? theme.colors.danger
          : theme.colors.textDim;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.shape.radiusSm,
        borderWidth: theme.shape.borderWidth,
        borderColor: rgba(color, 0.4),
        backgroundColor: rgba(color, 0.1),
      }}
    >
      {icon ?? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
      <Txt variant="label" size={9} color={color}>
        {label}
      </Txt>
    </View>
  );
}
