import type { Telemetry, WarningThresholds } from '../state/types';

export type WarningId =
  | 'mil'
  | 'oilPressure'
  | 'coolant'
  | 'oilTemp'
  | 'battery'
  | 'fuel'
  | 'speedAlert';

export type Severity = 'info' | 'warn' | 'danger';

export interface Warning {
  id: WarningId;
  label: string;
  detail: string;
  severity: Severity;
  /** False when no data source provides this channel — the lamp shows unlit. */
  monitored: boolean;
  active: boolean;
}

/**
 * Turns raw telemetry into the lamps on the cluster.
 *
 * A lamp the bike cannot report is rendered unlit-and-dim rather than hidden, so
 * the cluster keeps the same shape whether you are on GPS only or plugged into
 * the ECU — you can always see what is being watched.
 */
export function computeWarnings(
  telemetry: Telemetry,
  thresholds: WarningThresholds,
  available: Set<keyof Telemetry>,
): Warning[] {
  const has = (channel: keyof Telemetry) => available.has(channel);

  return [
    {
      id: 'mil',
      label: 'Check engine',
      detail: telemetry.dtcCodes.length
        ? telemetry.dtcCodes.join(', ')
        : 'No stored fault codes',
      severity: 'danger',
      monitored: has('rpm') || has('coolantC'),
      active: telemetry.mil || telemetry.dtcCodes.length > 0,
    },
    {
      id: 'oilPressure',
      label: 'Oil pressure',
      detail:
        telemetry.oilPressureBar != null
          ? `${telemetry.oilPressureBar.toFixed(1)} bar`
          : 'Not reported by this bike',
      severity: 'danger',
      monitored: has('oilPressureBar'),
      active:
        telemetry.oilPressureBar != null &&
        (telemetry.rpm ?? 0) > 900 &&
        telemetry.oilPressureBar < thresholds.oilPressureLowBar,
    },
    {
      id: 'coolant',
      label: 'Coolant temp',
      detail: telemetry.coolantC != null ? `${Math.round(telemetry.coolantC)} °C` : 'No data',
      severity: 'danger',
      monitored: has('coolantC'),
      active: telemetry.coolantC != null && telemetry.coolantC >= thresholds.coolantHighC,
    },
    {
      id: 'oilTemp',
      label: 'Oil temp',
      detail: telemetry.oilTempC != null ? `${Math.round(telemetry.oilTempC)} °C` : 'No data',
      severity: 'warn',
      monitored: has('oilTempC'),
      active: telemetry.oilTempC != null && telemetry.oilTempC >= thresholds.oilTempHighC,
    },
    {
      id: 'battery',
      label: 'Battery',
      detail: telemetry.batteryV != null ? `${telemetry.batteryV.toFixed(1)} V` : 'No data',
      severity: 'warn',
      monitored: has('batteryV'),
      active: telemetry.batteryV != null && telemetry.batteryV < thresholds.batteryLowV,
    },
    {
      id: 'fuel',
      label: 'Fuel',
      detail: telemetry.fuelPct != null ? `${Math.round(telemetry.fuelPct)} %` : 'No data',
      severity: 'warn',
      monitored: has('fuelPct'),
      active: telemetry.fuelPct != null && telemetry.fuelPct <= thresholds.fuelLowPct,
    },
    {
      id: 'speedAlert',
      label: 'Speed alert',
      detail:
        thresholds.speedAlertKph != null
          ? `Over ${Math.round(thresholds.speedAlertKph)} km/h`
          : 'Off',
      severity: 'warn',
      monitored: thresholds.speedAlertKph != null,
      active:
        thresholds.speedAlertKph != null && (telemetry.speedKph ?? 0) > thresholds.speedAlertKph,
    },
  ];
}

export function activeWarnings(warnings: Warning[]): Warning[] {
  return warnings.filter((w) => w.active);
}

export function highestSeverity(warnings: Warning[]): Severity | null {
  const active = activeWarnings(warnings);
  if (active.some((w) => w.severity === 'danger')) return 'danger';
  if (active.some((w) => w.severity === 'warn')) return 'warn';
  return active.length ? 'info' : null;
}
