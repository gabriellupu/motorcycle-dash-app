import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';
import { Theme } from '../../theme/types';
import { rgba } from '../../utils/color';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface GaugeProps {
  value: number | null;
  min?: number;
  max: number;
  /** Fraction of the scale where the redline zone starts (0..1). */
  redlineFrom?: number;
  size: number;
  /** Ring thickness override; defaults to the theme's. */
  thickness?: number;
  /** Tick label divisor, e.g. 1000 to print RPM as 1…14. */
  labelDivisor?: number;
  tickStep?: number;
  children?: React.ReactNode;
  /** Dimmed rendering for channels with no data source. */
  inactive?: boolean;
  /** Override the arc colour (the tach uses accentAlt). */
  color?: string;
  /** Sweep duration in ms — the ignition self-test uses a long one. */
  animateMs?: number;
}

/**
 * One gauge component, four looks.
 *
 * The theme decides whether this renders as a swept arc, a segment ring, a
 * needle dial or a flat bar — dash screens just ask for "a gauge".
 */
export function Gauge({
  value,
  min = 0,
  max,
  redlineFrom,
  size,
  thickness,
  labelDivisor,
  tickStep,
  children,
  inactive,
  color,
  animateMs = 180,
}: GaugeProps) {
  const theme = useTheme();
  const gauge = theme.gauge;
  const stroke = thickness ?? gauge.thickness;
  const fraction = clamp01(((value ?? min) - min) / Math.max(1e-6, max - min));

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(fraction, { duration: animateMs });
  }, [animateMs, fraction, progress]);

  const accent = color ?? theme.colors.accent;
  const redline = redlineFrom ?? 1;
  const overRedline = fraction >= redline && redline < 1;
  const activeColor = inactive
    ? theme.colors.textFaint
    : overRedline
      ? theme.colors.redline
      : accent;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - stroke / 2 - 2;
  const start = gauge.startDeg;
  const sweep = gauge.sweepDeg;
  const arcLength = (sweep * Math.PI * radius) / 180;

  const trackPath = arcPath(cx, cy, radius, start, start + sweep);
  const redlinePath =
    redline < 1 ? arcPath(cx, cy, radius, start + sweep * redline, start + sweep) : null;

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - progress.value),
  }));

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${start + sweep * progress.value}deg` }],
  }));

  const ticks = useMemo(() => {
    if (!gauge.ticks) return [];
    const step = tickStep ?? niceStep(max - min);
    const out: { value: number; major: boolean }[] = [];
    for (let v = min; v <= max + 1e-6; v += step / 2) {
      out.push({ value: v, major: Math.abs((v - min) % step) < step * 0.01 });
    }
    return out;
  }, [gauge.ticks, max, min, tickStep]);

  if (gauge.style === 'bar') {
    return (
      <BarGauge
        size={size}
        stroke={Math.max(4, stroke)}
        progress={progress}
        color={activeColor}
        theme={theme}
        redlineFrom={redline}
      >
        {children}
      </BarGauge>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="gaugeFill" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={activeColor} stopOpacity={0.6} />
            <Stop offset="1" stopColor={activeColor} stopOpacity={1} />
          </LinearGradient>
        </Defs>

        <Path
          d={trackPath}
          stroke={theme.colors.gaugeTrack}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />

        {redlinePath ? (
          <Path
            d={redlinePath}
            stroke={rgba(theme.colors.redline, 0.4)}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}

        {gauge.ticks ? (
          <G>
            {ticks.map((tick, index) => {
              const angle = start + sweep * clamp01((tick.value - min) / (max - min));
              const outer = polar(cx, cy, radius - stroke / 2 - 3, angle);
              const inner = polar(cx, cy, radius - stroke / 2 - (tick.major ? 12 : 7), angle);
              return (
                <Line
                  key={index}
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke={tick.major ? theme.colors.textDim : theme.colors.textFaint}
                  strokeWidth={tick.major ? 2 : 1}
                />
              );
            })}
          </G>
        ) : null}

        {gauge.tickLabels && labelDivisor ? (
          <G>
            {ticks
              .filter((t) => t.major)
              .map((tick, index) => {
                const angle = start + sweep * clamp01((tick.value - min) / (max - min));
                const point = polar(cx, cy, radius - stroke - 16, angle);
                return (
                  <SvgText
                    key={index}
                    x={point.x}
                    y={point.y + 4}
                    fill={theme.colors.textFaint}
                    fontSize={Math.max(9, size * 0.042)}
                    fontFamily={theme.typography.mono}
                    textAnchor="middle"
                  >
                    {Math.round(tick.value / labelDivisor)}
                  </SvgText>
                );
              })}
          </G>
        ) : null}

        {gauge.style === 'segments' ? (
          <SegmentRing
            cx={cx}
            cy={cy}
            radius={radius}
            stroke={stroke}
            start={start}
            sweep={sweep}
            count={gauge.segments}
            progress={progress}
            color={activeColor}
            theme={theme}
            redlineFrom={redline}
          />
        ) : (
          <AnimatedPath
            d={trackPath}
            stroke={theme.effects.glow > 0 ? 'url(#gaugeFill)' : activeColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap={gauge.style === 'analog' ? 'butt' : 'round'}
            strokeDasharray={[arcLength, arcLength]}
            animatedProps={arcProps}
          />
        )}

        {gauge.needle ? <Circle cx={cx} cy={cy} r={stroke * 0.55} fill={theme.colors.text} /> : null}
      </Svg>

      {gauge.needle ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: size, height: size }, needleStyle]}
        >
          <View
            style={{
              position: 'absolute',
              top: stroke + 6,
              left: size / 2 - 1.5,
              width: 3,
              height: size / 2 - stroke - 6,
              borderRadius: 2,
              backgroundColor: activeColor,
            }}
          />
        </Animated.View>
      ) : null}

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

/* ---------------------------------------------------------------- segments */

function SegmentRing({
  cx,
  cy,
  radius,
  stroke,
  start,
  sweep,
  count,
  progress,
  color,
  theme,
  redlineFrom,
}: {
  cx: number;
  cy: number;
  radius: number;
  stroke: number;
  start: number;
  sweep: number;
  count: number;
  progress: SharedValue<number>;
  color: string;
  theme: Theme;
  redlineFrom: number;
}) {
  const gap = sweep / count / 5;
  return (
    <G>
      {Array.from({ length: count }, (_, i) => {
        const from = start + (sweep / count) * i;
        const to = from + sweep / count - gap;
        const segmentFraction = (i + 0.5) / count;
        return (
          <Segment
            key={i}
            d={arcPath(cx, cy, radius, from, to)}
            stroke={stroke}
            progress={progress}
            threshold={segmentFraction}
            color={segmentFraction >= redlineFrom ? theme.colors.redline : color}
          />
        );
      })}
    </G>
  );
}

function Segment({
  d,
  stroke,
  progress,
  threshold,
  color,
}: {
  d: string;
  stroke: number;
  progress: SharedValue<number>;
  threshold: number;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    strokeOpacity: progress.value >= threshold ? 1 : 0.14,
  }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="butt"
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

/* --------------------------------------------------------------------- bar */

function BarGauge({
  size,
  stroke,
  progress,
  color,
  theme,
  redlineFrom,
  children,
}: {
  size: number;
  stroke: number;
  progress: SharedValue<number>;
  color: string;
  theme: Theme;
  redlineFrom: number;
  children?: React.ReactNode;
}) {
  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, progress.value * size),
  }));

  return (
    <View style={{ width: size, alignItems: 'center', gap: 16 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      <View
        style={{
          width: size,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: theme.colors.gaugeTrack,
          overflow: 'hidden',
        }}
      >
        {redlineFrom < 1 ? (
          <View
            style={{
              position: 'absolute',
              left: size * redlineFrom,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: rgba(theme.colors.redline, 0.35),
            }}
          />
        ) : null}
        <Animated.View style={[{ height: stroke, backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------- maths */

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

/** 0° = 12 o'clock, angles increase clockwise. */
export function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const from = polar(cx, cy, r, startDeg);
  const to = polar(cx, cy, r, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 1 ${to.x} ${to.y}`;
}

function niceStep(range: number): number {
  const raw = range / 8;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return step * magnitude;
}
