import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { listThemes } from '../../theme/themes';
import { Theme } from '../../theme/types';
import { useTheme } from '../../theme/ThemeProvider';
import { arcPath } from '../dash/Gauge';
import { Txt } from '../ui/Txt';

/** Horizontal theme gallery. Each card is drawn in its own theme's colours. */
export function ThemePicker({
  value,
  onChange,
  cardWidth = 132,
}: {
  value: string;
  onChange: (id: string) => void;
  cardWidth?: number;
}) {
  const themes = listThemes();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {themes.map((theme) => (
        <ThemeSwatch
          key={theme.id}
          theme={theme}
          selected={theme.id === value}
          width={cardWidth}
          onPress={() => onChange(theme.id)}
        />
      ))}
    </ScrollView>
  );
}

export function ThemeSwatch({
  theme,
  selected,
  width,
  onPress,
}: {
  theme: Theme;
  selected: boolean;
  width: number;
  onPress: () => void;
}) {
  const current = useTheme();
  const previewHeight = width * 0.62;
  const gaugeSize = previewHeight * 0.86;
  const cx = gaugeSize / 2;
  const radius = gaugeSize / 2 - 6;
  const start = theme.gauge.startDeg;
  const sweep = theme.gauge.sweepDeg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        width,
        borderRadius: current.shape.radius,
        borderWidth: selected ? 2 : current.shape.borderWidth,
        borderColor: selected ? current.colors.accent : current.colors.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: previewHeight,
          backgroundColor: theme.colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={gaugeSize} height={gaugeSize}>
          {theme.colors.bgGradient ? (
            <Rect x={0} y={0} width={gaugeSize} height={gaugeSize} fill="transparent" />
          ) : null}
          {theme.gauge.style === 'bar' ? (
            <>
              <Rect
                x={6}
                y={gaugeSize / 2 - 3}
                width={gaugeSize - 12}
                height={6}
                rx={3}
                fill={theme.colors.gaugeTrack}
              />
              <Rect
                x={6}
                y={gaugeSize / 2 - 3}
                width={(gaugeSize - 12) * 0.62}
                height={6}
                rx={3}
                fill={theme.colors.accent}
              />
            </>
          ) : (
            <>
              <Path
                d={arcPath(cx, cx, radius, start, start + sweep)}
                stroke={theme.colors.gaugeTrack}
                strokeWidth={theme.gauge.thickness * 0.55}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={arcPath(cx, cx, radius, start, start + sweep * 0.62)}
                stroke={theme.colors.accent}
                strokeWidth={theme.gauge.thickness * 0.55}
                fill="none"
                strokeLinecap={theme.gauge.style === 'analog' ? 'butt' : 'round'}
              />
            </>
          )}
        </Svg>
        <Txt
          variant="value"
          size={16}
          color={theme.colors.text}
          style={{ position: 'absolute', fontFamily: theme.typography.digits }}
        >
          88
        </Txt>
      </View>

      <View
        style={{
          padding: 8,
          gap: 4,
          backgroundColor: current.colors.surface,
        }}
      >
        <Txt variant="label" size={10}>
          {theme.name}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[theme.colors.accent, theme.colors.accentAlt, theme.colors.warn, theme.colors.danger].map(
            (color, index) => (
              <View
                key={index}
                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }}
              />
            ),
          )}
        </View>
      </View>
    </Pressable>
  );
}
