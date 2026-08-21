import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

export type TxtVariant = 'title' | 'heading' | 'body' | 'label' | 'value' | 'mono' | 'caption';

interface Props extends TextProps {
  variant?: TxtVariant;
  color?: string;
  size?: number;
  dim?: boolean;
  faint?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Every piece of text in the app goes through here so a theme swap restyles the
 * whole dash — family, weight, tracking and casing included.
 */
export function Txt({ variant = 'body', color, size, dim, faint, style, children, ...rest }: Props) {
  const theme = useTheme();
  const t = theme.typography;

  const base: TextStyle = (() => {
    switch (variant) {
      case 'title':
        return {
          fontFamily: t.display,
          fontSize: size ?? 28,
          fontWeight: '700',
          letterSpacing: t.labelTracking * 0.4,
        };
      case 'heading':
        return {
          fontFamily: t.display,
          fontSize: size ?? 18,
          fontWeight: t.labelWeight,
          letterSpacing: t.labelTracking * 0.5,
        };
      case 'label':
        return {
          fontFamily: t.display,
          fontSize: size ?? 11,
          fontWeight: t.labelWeight,
          letterSpacing: t.labelTracking,
        };
      case 'value':
        return {
          fontFamily: t.digits,
          fontSize: size ?? 22,
          fontWeight: t.digitWeight,
          letterSpacing: t.digitTracking * 0.25,
          fontVariant: ['tabular-nums'],
        };
      case 'mono':
        return { fontFamily: t.mono, fontSize: size ?? 12, letterSpacing: 0.4 };
      case 'caption':
        return { fontFamily: t.display, fontSize: size ?? 11, letterSpacing: 0.2 };
      default:
        return { fontFamily: t.display, fontSize: size ?? 14, letterSpacing: 0.1 };
    }
  })();

  const resolved = color ?? (faint ? theme.colors.textFaint : dim ? theme.colors.textDim : theme.colors.text);
  const content =
    variant === 'label' && t.uppercaseLabels && typeof children === 'string'
      ? children.toUpperCase()
      : children;

  return (
    <Text {...rest} style={[base, { color: resolved }, style]}>
      {content}
    </Text>
  );
}
