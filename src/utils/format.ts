import type { Units } from '../state/types';

export const KPH_TO_MPH = 0.621371;
export const KM_TO_MI = 0.621371;
export const BAR_TO_PSI = 14.5038;

export function speedIn(units: Units, kph: number | null | undefined): number | null {
  if (kph == null) return null;
  return units === 'imperial' ? kph * KPH_TO_MPH : kph;
}

export function speedUnit(units: Units): string {
  return units === 'imperial' ? 'MPH' : 'KM/H';
}

export function distanceIn(units: Units, km: number): number {
  return units === 'imperial' ? km * KM_TO_MI : km;
}

export function distanceUnit(units: Units): string {
  return units === 'imperial' ? 'mi' : 'km';
}

export function tempIn(units: Units, celsius: number | null | undefined): number | null {
  if (celsius == null) return null;
  return units === 'imperial' ? celsius * 1.8 + 32 : celsius;
}

export function tempUnit(units: Units): string {
  return units === 'imperial' ? '°F' : '°C';
}

export function pressureIn(units: Units, bar: number | null | undefined): number | null {
  if (bar == null) return null;
  return units === 'imperial' ? bar * BAR_TO_PSI : bar;
}

export function pressureUnit(units: Units): string {
  return units === 'imperial' ? 'psi' : 'bar';
}

/** '—' for missing values keeps every tile the same shape whatever the source. */
export const EMPTY = '—';

export function num(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return value.toFixed(digits);
}

export function padSpeed(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return String(Math.max(0, Math.round(value)));
}

export function clockTime(date: Date, use24h: boolean): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  if (use24h) return `${hours.toString().padStart(2, '0')}:${minutes}`;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const twelve = hours % 12 || 12;
  return `${twelve}:${minutes} ${suffix}`;
}

export function duration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function gearLabel(gear: number | null | undefined, moving: boolean): string {
  if (gear == null) return moving ? EMPTY : 'N';
  if (gear <= 0) return 'N';
  return String(gear);
}

export function compass(headingDeg: number | null | undefined): string {
  if (headingDeg == null) return EMPTY;
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(((headingDeg % 360) + 360) % 360 / 45) % 8];
}
