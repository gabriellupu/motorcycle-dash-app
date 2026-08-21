import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

import { bleService } from '../services/ble/BleService';
import { demoTransport } from '../services/ble/demoTransport';
import { gpsService } from '../services/gps/gpsService';
import { imuService } from '../services/sensors/imuService';
import { useAppStore } from '../state/appStore';
import { useLiveStore } from '../state/liveStore';

const KEEP_AWAKE_TAG = 'moto-dash';

/**
 * Owns every live data source while the dash is on screen: GPS, the IMU, the
 * Bluetooth link (or the simulator), screen wake-lock and orientation policy.
 * Each concern is its own effect so flipping one setting does not restart the
 * others mid-ride.
 */
export function useDashSession(active: boolean): void {
  const settings = useAppStore((s) => s.settings);
  const vehicle = useAppStore((s) => s.vehicle);

  /* GPS ------------------------------------------------------------------ */
  useEffect(() => {
    if (!active || settings.speedSource === 'obd') {
      gpsService.stop();
      return;
    }
    void gpsService.start();
    return () => gpsService.stop();
  }, [active, settings.speedSource]);

  /* Lean angle ------------------------------------------------------------ */
  useEffect(() => {
    if (!active || !settings.showLeanAngle) {
      imuService.stop();
      return;
    }
    void imuService.start(settings.leanOffsetDeg);
    return () => imuService.stop();
  }, [active, settings.showLeanAngle, settings.leanOffsetDeg]);

  /* Demo transport -------------------------------------------------------- */
  useEffect(() => {
    if (!active || !settings.demoMode) {
      if (demoTransport.running) demoTransport.stop();
      return;
    }
    demoTransport.start(vehicle);
    return () => demoTransport.stop();
  }, [active, settings.demoMode, vehicle]);

  /* Bluetooth auto-connect ------------------------------------------------ */
  useEffect(() => {
    if (!active || settings.demoMode) return;
    if (!settings.autoConnectBle || !settings.lastDeviceId) return;
    const { connection } = useLiveStore.getState();
    if (connection === 'connected' || connection === 'connecting') return;

    void bleService.connect(settings.lastDeviceId, {
      customPids: settings.customPids,
      pollIntervalMs: settings.pollIntervalMs,
    });
    // Intentionally no cleanup: the link should survive navigating to Settings.
  }, [
    active,
    settings.autoConnectBle,
    settings.lastDeviceId,
    settings.demoMode,
    settings.customPids,
    settings.pollIntervalMs,
  ]);

  /* Screen wake-lock ------------------------------------------------------ */
  useEffect(() => {
    if (!active || !settings.keepAwake) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [active, settings.keepAwake]);

  /* Orientation ----------------------------------------------------------- */
  useEffect(() => {
    const apply = async () => {
      try {
        switch (settings.orientationLock) {
          case 'portrait':
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            break;
          case 'landscape':
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            break;
          default:
            await ScreenOrientation.unlockAsync();
        }
      } catch {
        // Orientation control is unavailable on some tablets/emulators.
      }
    };
    void apply();
  }, [settings.orientationLock]);
}
