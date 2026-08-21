import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';

import { Txt } from './Txt';

function tap(): void {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

/* ------------------------------------------------------------------ Button */

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  size = 'md',
}: ButtonProps) {
  const theme = useTheme();
  const { colors, shape } = theme;
  const height = size === 'lg' ? 56 : size === 'sm' ? 36 : 46;

  const palette = {
    primary: { bg: colors.accent, border: colors.accent, text: theme.dark ? '#04070E' : '#FFFFFF' },
    secondary: { bg: colors.surfaceAlt, border: colors.border, text: colors.text },
    ghost: { bg: 'transparent', border: 'transparent', text: colors.textDim },
    danger: { bg: rgba(colors.danger, 0.16), border: colors.danger, text: colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          height,
          borderRadius: shape.radius,
          borderWidth: shape.borderWidth,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Txt variant="label" size={size === 'lg' ? 14 : 12} color={palette.text}>
        {loading ? 'Working…' : label}
      </Txt>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onChange(!value);
      }}
      style={{
        width: 52,
        height: 30,
        borderRadius: 15,
        padding: 3,
        backgroundColor: value ? colors.accent : colors.gaugeTrack,
        borderWidth: 1,
        borderColor: value ? colors.accent : colors.border,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: value ? (colors.bg === '#000000' ? '#000' : colors.bg) : colors.textDim,
          transform: [{ translateX: value ? 22 : 0 }],
        }}
      />
    </Pressable>
  );
}

/* --------------------------------------------------------------- Segmented */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
  compact,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { colors, shape } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.gaugeTrack,
          borderRadius: shape.radiusSm,
          padding: 3,
          gap: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              paddingVertical: compact ? 6 : 9,
              paddingHorizontal: 8,
              borderRadius: Math.max(2, shape.radiusSm - 2),
              backgroundColor: active ? colors.accent : 'transparent',
              alignItems: 'center',
            }}
          >
            <Txt
              variant="label"
              size={compact ? 10 : 11}
              color={active ? (colors.bg === '#000000' ? '#000' : colors.bg) : colors.textDim}
              numberOfLines={1}
            >
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ Slider */

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  format?: (value: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const commit = useCallback(
    (x: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / w));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      const clamped = Math.max(min, Math.min(max, snapped));
      if (clamped !== valueRef.current) onChange(Number(clamped.toFixed(4)));
    },
    [max, min, onChange, step],
  );

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => commit(event.nativeEvent.locationX),
      onPanResponderMove: (event) => commit(event.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
    setWidth(event.nativeEvent.layout.width);
  };

  const ratio = max === min ? 0 : (value - min) / (max - min);

  return (
    <View style={{ gap: 6 }}>
      <View
        {...responder.panHandlers}
        onLayout={onLayout}
        style={{ height: 34, justifyContent: 'center' }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.gaugeTrack }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              width: Math.max(0, ratio * width),
              backgroundColor: colors.accent,
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            left: Math.max(0, ratio * width - 11),
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        />
      </View>
      {format ? (
        <Txt variant="mono" dim size={11}>
          {format(value)}
        </Txt>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------- Field */

export function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
  autoCapitalize = 'none',
  style,
  onSubmitEditing,
  autoFocus,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secure?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const { colors, shape } = theme;
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboardType}
      secureTextEntry={secure}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmitEditing}
      style={[
        {
          height: 48,
          borderRadius: shape.radiusSm,
          borderWidth: shape.borderWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: 14,
          fontFamily: theme.typography.display,
          fontSize: 15,
        },
        style as StyleProp<ViewStyle>,
      ]}
    />
  );
}

/* --------------------------------------------------------------- SettingRow */

export function SettingRow({
  title,
  subtitle,
  right,
  onPress,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const { colors, shape } = useTheme();
  const body = (
    <View style={{ gap: children ? 10 : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="body" size={15}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="caption" dim>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );

  const frame: ViewStyle = {
    paddingVertical: 14,
    paddingHorizontal: shape.gap,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  };

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [frame, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={frame}>{body}</View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors, shape } = useTheme();
  return (
    <Txt
      variant="label"
      color={colors.accent}
      style={{ paddingHorizontal: shape.gap, paddingTop: 22, paddingBottom: 8 }}
    >
      {children}
    </Txt>
  );
}
