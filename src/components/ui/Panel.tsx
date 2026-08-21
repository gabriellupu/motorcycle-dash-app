import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Slightly stronger fill, for the tile-inside-a-tile case. */
  alt?: boolean;
  /** Disable the frosted-glass pass even on themes that use it. */
  flat?: boolean;
  padded?: boolean;
}

/** Themed surface: hairline border, theme radius, optional frosted glass. */
export function Panel({ children, style, alt, flat, padded = true }: Props) {
  const theme = useTheme();
  const { colors, shape } = theme;

  const frame: ViewStyle = {
    borderRadius: shape.radius,
    borderWidth: shape.borderWidth,
    borderColor: colors.border,
    padding: padded ? shape.gap : 0,
    overflow: 'hidden',
  };

  if (theme.effects.blur && !flat) {
    return (
      <View style={[frame, { backgroundColor: 'transparent' }, style]}>
        <BlurView
          intensity={theme.dark ? 26 : 34}
          tint={theme.dark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: alt ? colors.surfaceAlt : colors.surface },
          ]}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={[frame, { backgroundColor: alt ? colors.surfaceAlt : colors.surface }, style]}>
      {children}
    </View>
  );
}
