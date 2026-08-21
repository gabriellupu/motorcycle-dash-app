import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { getMapStyle, metersPerPixel, tilesAround } from '../../services/map/tiles';
import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';
import { Txt } from '../ui/Txt';

export interface MapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  headingDeg: number | null;
  zoom: number;
  styleId: string;
  size: number;
  /** Rotate the map so the direction of travel is always up. */
  followHeading: boolean;
  /** Circular (dash-pod) or rounded-rect (panel) framing. */
  shape?: 'circle' | 'panel';
  height?: number;
}

interface TrailPoint {
  lat: number;
  lon: number;
}

/**
 * A small live map that dissolves into the dash instead of sitting in a box.
 *
 * Raster tiles are drawn by hand (see services/map/tiles.ts) and then masked
 * with a radial gradient, so the edges fade to nothing and the map reads as
 * part of the instrument cluster rather than an embedded widget.
 */
export function MapPreview({
  latitude,
  longitude,
  headingDeg,
  zoom,
  styleId,
  size,
  followHeading,
  shape = 'panel',
  height,
}: MapPreviewProps) {
  const theme = useTheme();
  const mapStyle = getMapStyle(styleId);
  const boxHeight = height ?? size;
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const lastPoint = useRef<TrailPoint | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const previous = lastPoint.current;
    // Only record a point every ~5 m so the trail stays cheap.
    if (previous) {
      const dLat = Math.abs(previous.lat - latitude);
      const dLon = Math.abs(previous.lon - longitude);
      if (dLat < 0.00004 && dLon < 0.00004) return;
    }
    const point = { lat: latitude, lon: longitude };
    lastPoint.current = point;
    setTrail((current) => [...current.slice(-160), point]);
  }, [latitude, longitude]);

  const tiles = useMemo(() => {
    if (latitude == null || longitude == null) return [];
    // A rotated map needs a bigger square so corners stay covered.
    const covered = Math.ceil(Math.max(size, boxHeight) * (followHeading ? 1.5 : 1.1));
    return tilesAround(mapStyle, latitude, longitude, zoom, covered);
  }, [latitude, longitude, mapStyle, zoom, size, boxHeight, followHeading]);

  const rotation = followHeading && headingDeg != null ? -headingDeg : 0;
  const hasFix = latitude != null && longitude != null;

  const trailPath = useMemo(() => {
    if (!hasFix || trail.length < 2) return null;
    const mpp = metersPerPixel(latitude!, zoom);
    const points = trail.map((point) => {
      const dLat = point.lat - latitude!;
      const dLon = point.lon - longitude!;
      const metersNorth = dLat * 111_320;
      const metersEast = dLon * 111_320 * Math.cos((latitude! * Math.PI) / 180);
      return { x: size / 2 + metersEast / mpp, y: boxHeight / 2 - metersNorth / mpp };
    });
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }, [trail, latitude, longitude, zoom, size, boxHeight, hasFix]);

  // No fix yet: a quiet placeholder pod rather than an empty or half-drawn map.
  if (!hasFix) {
    return (
      <View
        style={{
          width: size,
          height: boxHeight,
          borderRadius: shape === 'circle' ? Math.min(size, boxHeight) / 2 : theme.shape.radius,
          borderWidth: theme.shape.borderWidth,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          overflow: 'hidden',
        }}
      >
        <Svg width={Math.min(size, boxHeight) * 0.5} height={Math.min(size, boxHeight) * 0.5} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} stroke={theme.colors.textFaint} strokeWidth={1.2} fill="none" />
          <Path
            d="M12 6 L15 17 L12 14.5 L9 17 Z"
            fill={theme.colors.textFaint}
          />
        </Svg>
        <Txt variant="label" size={8} faint numberOfLines={1}>
          Waiting for GPS
        </Txt>
      </View>
    );
  }

  const content = (
    <View
      style={{
        width: size,
        height: boxHeight,
        overflow: 'hidden',
        backgroundColor: theme.dark ? '#0A0E14' : '#E7EBF0',
      }}
    >
      {/* Tiles */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${rotation}deg` }] },
        ]}
      >
        {/* Grid backdrop: shows through whenever tiles are missing — offline,
            out of signal, or the "vector grid" style — so the pod is never blank */}
        <Svg width={size} height={boxHeight} style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={size} height={boxHeight} fill={theme.colors.bg} />
          <G opacity={0.35}>
            {Array.from({ length: 9 }, (_, i) => (
              <Line
                key={`h${i}`}
                x1={0}
                y1={(boxHeight / 8) * i}
                x2={size}
                y2={(boxHeight / 8) * i}
                stroke={theme.colors.accent}
                strokeWidth={0.6}
              />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <Line
                key={`v${i}`}
                x1={(size / 8) * i}
                y1={0}
                x2={(size / 8) * i}
                y2={boxHeight}
                stroke={theme.colors.accent}
                strokeWidth={0.6}
              />
            ))}
          </G>
        </Svg>

        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url }}
            style={{
              position: 'absolute',
              width: 256,
              height: 256,
              left: size / 2 + tile.dx,
              top: boxHeight / 2 + tile.dy,
            }}
            contentFit="cover"
            transition={140}
            cachePolicy="memory-disk"
          />
        ))}

        {/* Trail */}
        {trailPath ? (
          <Svg width={size} height={boxHeight} style={StyleSheet.absoluteFill}>
            <Path
              d={trailPath}
              stroke={theme.colors.accent}
              strokeWidth={3}
              strokeOpacity={0.9}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>

      {/* Theme tint keeps third-party tiles inside the palette */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.mapTint }]}
      />

      {/* Rider marker */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: size / 2 - 12,
          top: boxHeight / 2 - 12,
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={24} height={24}>
          <Circle cx={12} cy={12} r={11} fill={rgba(theme.colors.accent, 0.18)} />
          <Path
            d="M12 3 L18 20 L12 16 L6 20 Z"
            fill={hasFix ? theme.colors.accent : theme.colors.textFaint}
          />
        </Svg>
      </View>
    </View>
  );

  // react-native-web has no real masked view, so fall back to edge gradients
  // there; native gets the nicer radial dissolve.
  if (Platform.OS === 'web') {
    const fade = theme.colors.bg;
    return (
      <View
        style={{
          width: size,
          height: boxHeight,
          borderRadius: shape === 'circle' ? Math.min(size, boxHeight) / 2 : theme.shape.radius,
          overflow: 'hidden',
        }}
      >
        {content}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[fade, 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%' }}
          />
          <LinearGradient
            colors={['transparent', fade]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%' }}
          />
          <LinearGradient
            colors={[fade, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '28%' }}
          />
          <LinearGradient
            colors={['transparent', fade]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '28%' }}
          />
        </View>
        <Txt
          variant="caption"
          size={8}
          faint
          style={{ position: 'absolute', right: 6, bottom: 2 }}
          numberOfLines={1}
        >
          {mapStyle.attribution}
        </Txt>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: boxHeight }}>
      <MaskedView
        style={{ width: size, height: boxHeight }}
        maskElement={
          <Svg width={size} height={boxHeight}>
            <Defs>
              <RadialGradient id="fade" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="0.82" stopColor="#FFFFFF" stopOpacity={0.45} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {shape === 'circle' ? (
              <Circle cx={size / 2} cy={boxHeight / 2} r={Math.min(size, boxHeight) / 2} fill="url(#fade)" />
            ) : (
              <Rect x={0} y={0} width={size} height={boxHeight} rx={theme.shape.radius} fill="url(#fade)" />
            )}
          </Svg>
        }
      >
        {content}
      </MaskedView>

      <Txt
        variant="caption"
        size={8}
        faint
        style={{ position: 'absolute', right: 6, bottom: 2 }}
        numberOfLines={1}
      >
        {mapStyle.attribution}
      </Txt>
    </View>
  );
}
