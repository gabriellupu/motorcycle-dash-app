import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';

const NOISE = require('../../../assets/noise.png');

/**
 * Paints the themed backdrop: base colour, optional gradient, vignette, CRT
 * scanlines and film grain. Sits behind every screen at zero interaction cost
 * (`pointerEvents: none`).
 */
export function ScreenBackground({ children }: { children?: React.ReactNode }) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const { colors, effects } = theme;

  const scanlines = useMemo(() => {
    if (!effects.scanlines) return null;
    const spacing = 4;
    const count = Math.ceil(height / spacing);
    return Array.from({ length: count }, (_, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: i * spacing,
          height: 1,
          backgroundColor: rgba('#000000', 0.22),
        }}
      />
    ));
  }, [effects.scanlines, height]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {colors.bgGradient ? (
        <LinearGradient
          colors={colors.bgGradient as [string, string, ...string[]]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {children}

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {effects.vignette > 0 ? (
          <>
            <LinearGradient
              colors={[rgba('#000000', effects.vignette * 0.85), 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '28%' }}
            />
            <LinearGradient
              colors={['transparent', rgba('#000000', effects.vignette * 0.9)]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%' }}
            />
          </>
        ) : null}

        {scanlines}

        {effects.grain > 0 ? (
          <Image
            source={NOISE}
            resizeMode="repeat"
            style={[StyleSheet.absoluteFill, { opacity: effects.grain }]}
          />
        ) : null}
      </View>
    </View>
  );
}
