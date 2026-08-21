/**
 * Lean angle and lateral G from the phone's accelerometer.
 *
 * With the phone clamped to the bars, gravity in the device frame rotates with
 * the bike, so roll ≈ lean. `leanOffsetDeg` cancels the mount angle: the rider
 * taps "Level" in Settings while the bike is upright.
 */

import { Accelerometer } from 'expo-sensors';

import { useLiveStore } from '../../state/liveStore';

type Sub = { remove: () => void } | null;

class ImuService {
  private sub: Sub = null;
  private offsetDeg = 0;
  private smoothed = 0;
  private lastSample: { x: number; y: number; z: number } | null = null;

  get running(): boolean {
    return this.sub != null;
  }

  setOffset(deg: number): void {
    this.offsetDeg = deg;
  }

  /** Current raw roll — used by the Settings "Level" button. */
  currentRawRollDeg(): number | null {
    if (!this.lastSample) return null;
    return rollFrom(this.lastSample);
  }

  async start(offsetDeg = 0, intervalMs = 100): Promise<boolean> {
    this.offsetDeg = offsetDeg;
    if (this.sub) return true;
    try {
      const available = await Accelerometer.isAvailableAsync();
      if (!available) return false;
      Accelerometer.setUpdateInterval(intervalMs);
      this.sub = Accelerometer.addListener((sample) => {
        this.lastSample = sample;
        const roll = rollFrom(sample) - this.offsetDeg;
        // Heavy smoothing: vibration on a bike is brutal.
        this.smoothed = this.smoothed + (roll - this.smoothed) * 0.15;
        const magnitude = Math.hypot(sample.x, sample.y, sample.z) || 1;
        useLiveStore.getState().ingest({
          leanDeg: Math.round(this.smoothed * 10) / 10,
          gLat: Math.round((sample.x / magnitude) * 100) / 100,
          gLon: Math.round((sample.y / magnitude) * 100) / 100,
        });
      });
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.sub?.remove();
    this.sub = null;
    this.smoothed = 0;
  }
}

function rollFrom(sample: { x: number; y: number; z: number }): number {
  // Rotation of the gravity vector inside the screen plane; +ve = leaning right.
  // A near-flat phone has no meaningful roll, so fall back to the screen-plane
  // projection only when there is enough gravity in it.
  const inPlane = Math.hypot(sample.x, sample.y);
  if (inPlane < 0.25) return 0;
  return (Math.atan2(sample.x, -sample.y) * 180) / Math.PI;
}

export const imuService = new ImuService();
