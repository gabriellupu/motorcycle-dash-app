import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export type Orientation = 'portrait' | 'landscape';

export interface LayoutInfo {
  width: number;
  height: number;
  orientation: Orientation;
  isLandscape: boolean;
  isTablet: boolean;
  /** Multiplier for type and gauge sizes, 0.85 (small phone) … 1.6 (tablet). */
  scale: number;
  /** Shortest edge — the dimension that actually constrains a no-scroll dash. */
  min: number;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const min = Math.min(width, height);
    const isTablet = min >= 600;
    const scale = clamp(min / 400, 0.82, isTablet ? 1.6 : 1.18);
    return {
      width,
      height,
      orientation: isLandscape ? 'landscape' : 'portrait',
      isLandscape,
      isTablet,
      scale,
      min,
    };
  }, [width, height]);
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}
