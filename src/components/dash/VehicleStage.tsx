import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';
import { CarBodyStyle, VehicleType } from '../../data/vehicles';
import { VectorVehicle } from '../vehicle/VectorVehicle';

export interface VehicleStageProps {
  /** Cut-out frames, ordered front → side profile. */
  frames: string[];
  /** Decides which built-in silhouette stands in until artwork exists. */
  vehicleType: VehicleType;
  bodyStyle?: CarBodyStyle;
  width: number;
  height: number;
  /** Which way the vehicle faces / which side of the screen it is docked on. */
  side: 'left' | 'right';
  /** Plays the 3D entrance once on mount. */
  animateIn?: boolean;
  /** Live lean angle in degrees; the artwork tips with the vehicle. */
  leanDeg?: number;
  /** 0..1 — drives the forward "drive" lean and the glow intensity. */
  intensity?: number;
  reduceMotion?: boolean;
  onEntranceEnd?: () => void;
}

const ENTRANCE_MS = 1500;

/**
 * The vehicle itself: a 3D-feeling turntable entrance, then a live subject that
 * leans with the rider and breathes with the engine.
 *
 * With several captured angles it cross-fades real frames as it rotates; with a
 * single cut-out it uses a perspective rotateY, which reads as 3D because the
 * subject has real alpha and a grounded shadow.
 */
export function VehicleStage({
  frames,
  vehicleType,
  bodyStyle,
  width,
  height,
  side,
  animateIn,
  leanDeg = 0,
  intensity = 0,
  reduceMotion,
  onEntranceEnd,
}: VehicleStageProps) {
  const theme = useTheme();
  const progress = useSharedValue(animateIn && !reduceMotion ? 0 : 1);
  const idle = useSharedValue(0);
  const lean = useSharedValue(0);

  useEffect(() => {
    if (animateIn && !reduceMotion) {
      progress.value = 0;
      progress.value = withDelay(
        120,
        withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.cubic) }),
      );
      const timeout = setTimeout(() => onEntranceEnd?.(), ENTRANCE_MS + 200);
      return () => clearTimeout(timeout);
    }
    progress.value = 1;
    onEntranceEnd?.();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateIn, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      idle.value = 0;
      return;
    }
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [idle, reduceMotion]);

  useEffect(() => {
    lean.value = withTiming(Math.max(-45, Math.min(45, leanDeg)), { duration: 240 });
  }, [lean, leanDeg]);

  const facing = side === 'left' ? 1 : -1;

  const stageStyle = useAnimatedStyle(() => {
    const entrance = progress.value;
    const bob = interpolate(idle.value, [0, 1], [0, -6]);
    return {
      opacity: interpolate(entrance, [0, 0.25, 1], [0, 0.6, 1]),
      transform: [
        { perspective: 1000 },
        { translateX: interpolate(entrance, [0, 1], [width * 0.22 * facing, 0]) },
        { translateY: bob },
        { scale: interpolate(entrance, [0, 1], [1.22, 1]) },
        { rotateY: `${interpolate(entrance, [0, 1], [78 * facing, 0])}deg` },
        // Lean the whole subject with the bike, plus a little drive squat.
        { rotateZ: `${lean.value * 0.55}deg` },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.55 + intensity * 0.35]),
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.5, 1]) },
      { translateX: lean.value * 0.6 },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.9, 0.35 + intensity * 0.5]),
  }));

  const hasArtwork = frames.length > 0;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {/* Accent glow behind the bike — a real radial falloff, not a tinted box */}
      {theme.effects.glow > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width, height }, glowStyle]}
        >
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="bikeGlow" cx="50%" cy="52%" rx="52%" ry="46%">
                <Stop
                  offset="0"
                  stopColor={theme.colors.glow}
                  stopOpacity={theme.effects.glow * 0.22}
                />
                <Stop
                  offset="0.6"
                  stopColor={theme.colors.glow}
                  stopOpacity={theme.effects.glow * 0.08}
                />
                <Stop offset="1" stopColor={theme.colors.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={height} fill="url(#bikeGlow)" />
          </Svg>
        </Animated.View>
      ) : null}

      <Animated.View style={[{ width, height, justifyContent: 'center' }, stageStyle]}>
        {hasArtwork ? (
          frames.map((uri, index) => (
            <VehicleFrame
              key={uri}
              uri={uri}
              width={width}
              height={height}
              mirrored={side === 'right'}
              progress={progress}
              index={index}
              count={frames.length}
            />
          ))
        ) : (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scaleX: side === 'right' ? -1 : 1 }],
            }}
          >
            <VectorVehicle
              type={vehicleType}
              bodyStyle={bodyStyle}
              size={Math.min(width, height * 1.7)}
              wireframe={!theme.effects.blur}
            />
          </View>
        )}
      </Animated.View>

      {/* Contact shadow keeps the cut-out grounded instead of floating */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            bottom: height * 0.06,
            width: width * 0.72,
            height: 14,
            borderRadius: 7,
            overflow: 'hidden',
          },
          shadowStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            rgba(theme.dark ? '#000000' : '#0B1220', 0.55),
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

function VehicleFrame({
  uri,
  width,
  height,
  mirrored,
  progress,
  index,
  count,
}: {
  uri: string;
  width: number;
  height: number;
  mirrored: boolean;
  progress: SharedValue<number>;
  index: number;
  count: number;
}) {
  // With a real turntable the frame index follows the entrance rotation:
  // progress 0 = front-most frame, progress 1 = left profile.
  const style = useAnimatedStyle(() => {
    if (count <= 1) return { opacity: 1 };
    const position = (1 - progress.value) * (count - 1);
    return { opacity: Math.max(0, 1 - Math.abs(position - index)) };
  });

  return (
    <Animated.View
      style={[
        count > 1 ? { position: 'absolute', left: 0, top: 0 } : null,
        { width, height, transform: [{ scaleX: mirrored ? -1 : 1 }] },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width, height }}
        contentFit="contain"
        transition={200}
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}
