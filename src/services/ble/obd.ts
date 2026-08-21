/**
 * ELM327 / OBD-II protocol helpers.
 *
 * Almost every cheap Bluetooth dongle (Vgate, Veepeak, Konnwei, OBDLink…) speaks
 * the ELM327 AT command set over a serial-style characteristic: you write an
 * ASCII command terminated with \r and read ASCII back until a '>' prompt.
 * This module is pure and testable — nothing in here touches Bluetooth.
 */

import type { Telemetry } from '../../state/types';

export type TelemetryChannel = keyof Telemetry;

export interface PidSpec {
  /** Mode + PID, e.g. '010C'. */
  pid: string;
  label: string;
  unit: string;
  channel: TelemetryChannel;
  /** Decodes the data bytes (already stripped of the 41 XX header). */
  decode: (bytes: number[]) => number | null;
  /** Poll priority: 1 = every cycle, 2 = every other, 4 = every fourth. */
  every: 1 | 2 | 4 | 8;
}

const byteA = (b: number[]) => (b.length > 0 ? b[0] : null);
const wordAB = (b: number[]) => (b.length > 1 ? b[0] * 256 + b[1] : null);
const pct255 = (b: number[]) => {
  const a = byteA(b);
  return a == null ? null : (a * 100) / 255;
};
const tempC = (b: number[]) => {
  const a = byteA(b);
  return a == null ? null : a - 40;
};

/** The standard SAE J1979 channels the dash understands. */
export const STANDARD_PIDS: PidSpec[] = [
  {
    pid: '010C',
    label: 'Engine RPM',
    unit: 'rpm',
    channel: 'rpm',
    decode: (b) => {
      const v = wordAB(b);
      return v == null ? null : v / 4;
    },
    every: 1,
  },
  { pid: '010D', label: 'Vehicle speed', unit: 'km/h', channel: 'speedKph', decode: byteA, every: 1 },
  { pid: '0111', label: 'Throttle', unit: '%', channel: 'throttlePct', decode: pct255, every: 1 },
  { pid: '0104', label: 'Engine load', unit: '%', channel: 'engineLoadPct', decode: pct255, every: 2 },
  { pid: '0105', label: 'Coolant', unit: '°C', channel: 'coolantC', decode: tempC, every: 2 },
  { pid: '015C', label: 'Oil temp', unit: '°C', channel: 'oilTempC', decode: tempC, every: 4 },
  { pid: '012F', label: 'Fuel level', unit: '%', channel: 'fuelPct', decode: pct255, every: 4 },
  {
    pid: '0142',
    label: 'Battery',
    unit: 'V',
    channel: 'batteryV',
    decode: (b) => {
      const v = wordAB(b);
      return v == null ? null : v / 1000;
    },
    every: 4,
  },
  { pid: '010F', label: 'Intake air', unit: '°C', channel: 'intakeC', decode: tempC, every: 8 },
  { pid: '0146', label: 'Ambient air', unit: '°C', channel: 'ambientC', decode: tempC, every: 8 },
  {
    pid: '015E',
    label: 'Fuel rate',
    unit: 'L/h',
    channel: 'fuelRateLph',
    decode: (b) => {
      const v = wordAB(b);
      return v == null ? null : v / 20;
    },
    every: 8,
  },
];

/**
 * Oil pressure is not part of standard OBD-II — bikes that expose it do so on a
 * manufacturer PID. Riders can add their own mapping in Settings → Data.
 */
export interface CustomPidSpec {
  id: string;
  pid: string;
  label: string;
  unit: string;
  channel: TelemetryChannel;
  /** Which data byte(s) carry the value. */
  source: 'A' | 'B' | 'AB';
  scale: number;
  offset: number;
  every: 1 | 2 | 4 | 8;
}

export function customToPidSpec(custom: CustomPidSpec): PidSpec {
  return {
    pid: custom.pid.toUpperCase().replace(/\s+/g, ''),
    label: custom.label,
    unit: custom.unit,
    channel: custom.channel,
    every: custom.every,
    decode: (bytes) => {
      const raw =
        custom.source === 'A'
          ? byteA(bytes)
          : custom.source === 'B'
            ? (bytes[1] ?? null)
            : wordAB(bytes);
      return raw == null ? null : raw * custom.scale + custom.offset;
    },
  };
}

/** Handy presets for the custom-PID editor. */
export const CUSTOM_PID_PRESETS: CustomPidSpec[] = [
  {
    id: 'oil-pressure-bar-a',
    pid: '0122',
    label: 'Oil pressure',
    unit: 'bar',
    channel: 'oilPressureBar',
    source: 'A',
    scale: 0.1,
    offset: 0,
    every: 2,
  },
  {
    id: 'oil-pressure-kpa-ab',
    pid: '010A',
    label: 'Oil pressure (kPa/100)',
    unit: 'bar',
    channel: 'oilPressureBar',
    source: 'A',
    scale: 0.03,
    offset: 0,
    every: 2,
  },
  {
    id: 'gear',
    pid: '01A4',
    label: 'Gear',
    unit: '',
    channel: 'gear',
    source: 'A',
    scale: 1,
    offset: 0,
    every: 1,
  },
];

/** ELM327 bring-up. Order matters: reset, echo off, headers off, auto protocol. */
export const INIT_COMMANDS: { cmd: string; description: string; waitMs?: number }[] = [
  { cmd: 'ATZ', description: 'Reset adapter', waitMs: 1200 },
  { cmd: 'ATE0', description: 'Echo off' },
  { cmd: 'ATL0', description: 'Linefeeds off' },
  { cmd: 'ATS0', description: 'Spaces off' },
  { cmd: 'ATH0', description: 'Headers off' },
  { cmd: 'ATSP0', description: 'Auto protocol' },
  { cmd: '0100', description: 'Handshake', waitMs: 2500 },
];

const HEX = /^[0-9A-F]+$/;

/** Strips prompts/whitespace and returns the uppercase hex payload lines. */
export function cleanLines(raw: string): string[] {
  return raw
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/>/g, '').replace(/\s+/g, '').toUpperCase())
    .filter(Boolean);
}

export interface ObdResponse {
  /** Echoed mode+pid, e.g. '010C'. */
  pid: string;
  bytes: number[];
}

export const NO_DATA_MARKERS = ['NODATA', 'STOPPED', 'UNABLETOCONNECT', 'CANERROR', 'BUSINIT', '?'];

/**
 * Parses a mode-01 style reply. Handles both single frames ("410C1AF8") and
 * multi-line/ISO-TP replies where a length prefix precedes the data.
 */
export function parseObdResponse(raw: string): ObdResponse | null {
  for (const line of cleanLines(raw)) {
    if (NO_DATA_MARKERS.some((marker) => line.includes(marker))) return null;
    if (!HEX.test(line) || line.length < 4) continue;

    // Drop an ISO-TP single-frame length nibble pair if present (e.g. '0341...').
    const candidates = [line];
    if (line.length > 4) candidates.push(line.slice(2));

    for (const candidate of candidates) {
      const mode = candidate.slice(0, 2);
      if (mode !== '41' && mode !== '42' && mode !== '01') continue;
      const pidHex = candidate.slice(2, 4);
      const dataHex = candidate.slice(4);
      const bytes: number[] = [];
      for (let i = 0; i + 1 < dataHex.length; i += 2) {
        bytes.push(parseInt(dataHex.slice(i, i + 2), 16));
      }
      if (bytes.some(Number.isNaN)) continue;
      return { pid: `01${pidHex}`, bytes };
    }
  }
  return null;
}

/** Decodes a mode-03 reply into P/C/B/U codes. */
export function parseDtcs(raw: string): string[] {
  const codes: string[] = [];
  const letters = ['P', 'C', 'B', 'U'];
  for (const line of cleanLines(raw)) {
    if (!HEX.test(line)) continue;
    let body = line;
    if (body.startsWith('43')) body = body.slice(2);
    else continue;
    for (let i = 0; i + 3 < body.length; i += 4) {
      const chunk = body.slice(i, i + 4);
      if (chunk === '0000') continue;
      const first = parseInt(chunk[0], 16);
      const letter = letters[(first >> 2) & 0b11];
      const digit = (first & 0b11).toString(16);
      codes.push(`${letter}${digit}${chunk.slice(1)}`.toUpperCase());
    }
  }
  return [...new Set(codes)];
}

/**
 * Decodes a supported-PID bitmask reply (0100/0120/0140…) into the list of
 * supported PIDs, so we only poll what the ECU actually answers.
 */
export function parseSupportedPids(response: ObdResponse): string[] {
  const base = parseInt(response.pid.slice(2), 16);
  const supported: string[] = [];
  response.bytes.slice(0, 4).forEach((byte, byteIndex) => {
    for (let bit = 0; bit < 8; bit++) {
      if (byte & (0x80 >> bit)) {
        const pidNumber = base + byteIndex * 8 + bit + 1;
        supported.push(`01${pidNumber.toString(16).toUpperCase().padStart(2, '0')}`);
      }
    }
  });
  return supported;
}

export const SUPPORT_QUERIES = ['0100', '0120', '0140', '0160'];

/**
 * Estimates the selected gear from the RPM/speed ratio. Bikes rarely expose a
 * gear PID; the ratio is stable enough to be useful once we have both channels.
 */
export function estimateGear(
  rpm: number | null,
  speedKph: number | null,
  ratios: number[],
): number | null {
  if (!rpm || !speedKph || speedKph < 5 || rpm < 800) return null;
  const ratio = rpm / speedKph;
  let best = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  ratios.forEach((r, index) => {
    const delta = Math.abs(ratio - r) / r;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = index + 1;
    }
  });
  return bestDelta < 0.18 ? best : null;
}

/**
 * Learns per-gear rpm/speed ratios while riding, so gear estimation adapts to
 * the actual bike instead of a hard-coded gearbox.
 */
export class GearLearner {
  private buckets: { ratio: number; weight: number }[] = [];

  observe(rpm: number | null, speedKph: number | null): void {
    if (!rpm || !speedKph || speedKph < 15 || rpm < 1500) return;
    const ratio = rpm / speedKph;
    const hit = this.buckets.find((b) => Math.abs(b.ratio - ratio) / b.ratio < 0.06);
    if (hit) {
      hit.ratio = (hit.ratio * hit.weight + ratio) / (hit.weight + 1);
      hit.weight = Math.min(hit.weight + 1, 200);
    } else if (this.buckets.length < 8) {
      this.buckets.push({ ratio, weight: 1 });
    }
  }

  ratios(): number[] {
    return this.buckets
      .filter((b) => b.weight > 6)
      .map((b) => b.ratio)
      .sort((a, b) => b - a);
  }

  gear(rpm: number | null, speedKph: number | null): number | null {
    return estimateGear(rpm, speedKph, this.ratios());
  }
}
