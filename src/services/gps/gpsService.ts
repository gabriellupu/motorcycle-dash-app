/**
 * GPS speed, heading and position.
 *
 * This is the dash's floor: with no dongle at all, the rider still gets speed,
 * heading, altitude and the moving map. Speed is smoothed lightly because raw
 * GNSS speed is noisy below walking pace.
 */

import * as Location from 'expo-location';

import { useLiveStore } from '../../state/liveStore';

export interface GpsOptions {
  /** Minimum ms between fixes. */
  intervalMs?: number;
}

class GpsService {
  private subscription: Location.LocationSubscription | null = null;
  private smoothed: number | null = null;
  private lastHeading = 0;

  get running(): boolean {
    return this.subscription != null;
  }

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async start(options: GpsOptions = {}): Promise<boolean> {
    if (this.subscription) return true;
    const live = useLiveStore.getState();

    try {
      const granted = await this.requestPermission();
      if (!granted) {
        live.setGps(false, 'Location permission denied — speed will only show with a dongle.');
        return false;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        live.setGps(false, 'Location services are switched off on this device.');
        return false;
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: options.intervalMs ?? 500,
          distanceInterval: 0,
        },
        (position) => this.onFix(position),
      );
      live.setGps(true, null);
      return true;
    } catch (err) {
      live.setGps(false, err instanceof Error ? err.message : 'Could not start GPS.');
      return false;
    }
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.smoothed = null;
    useLiveStore.getState().setGps(false, null);
  }

  private onFix(position: Location.LocationObject): void {
    const { coords } = position;
    const raw = coords.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : 0;
    // Below ~2 km/h GNSS speed is mostly noise; clamp it so the dash reads 0 at rest.
    const value = raw < 2 ? 0 : raw;
    this.smoothed = this.smoothed == null ? value : this.smoothed + (value - this.smoothed) * 0.45;

    if (coords.heading != null && coords.heading >= 0 && value > 3) {
      this.lastHeading = coords.heading;
    }

    useLiveStore.getState().ingestGps({
      speedKph: Math.round(this.smoothed * 10) / 10,
      speedSource: 'gps',
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitudeM: coords.altitude ?? null,
      headingDeg: this.lastHeading,
      gpsAccuracyM: coords.accuracy ?? null,
    });
  }
}

export const gpsService = new GpsService();
