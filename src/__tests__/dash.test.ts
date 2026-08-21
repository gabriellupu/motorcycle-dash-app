import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findEntry, isElectric, searchVehicles, yearsFor } from '../data/vehicles';
import { getMapStyle, latToTileY, lonToTileX, tilesAround } from '../services/map/tiles';
import { heroFrom, turntableFrom } from '../services/ai/frames';
import { computeWarnings } from '../services/warnings';
import { emptyTelemetry } from '../state/types';
import type { Telemetry, VehicleAngle, WarningThresholds } from '../state/types';
import { hsl, luminance, mix, rgba, toHex } from '../utils/color';
import { compass, distanceIn, duration, gearLabel, num, speedIn, tempIn } from '../utils/format';

describe('vehicle catalogue search', () => {
  it('matches a full label', () => {
    assert.equal(searchVehicles('Yamaha MT-09', 'motorcycle')[0].model, 'MT-09');
  });

  it('matches a squashed model code', () => {
    assert.equal(searchVehicles('mt09', 'motorcycle')[0].label, 'Yamaha MT-09');
  });

  it('matches on make alone', () => {
    assert.ok(searchVehicles('ducati', 'motorcycle').every((b) => b.make === 'Ducati'));
  });

  it('returns nothing for an empty query', () => {
    assert.deepEqual(searchVehicles('   ', 'car'), []);
  });

  it('keeps bikes and cars in separate namespaces', () => {
    // Honda and BMW build both; each search must only see its own type.
    assert.ok(searchVehicles('honda', 'car').every((v) => v.type === 'car'));
    assert.ok(searchVehicles('honda', 'motorcycle').every((v) => v.type === 'motorcycle'));
    assert.equal(searchVehicles('Golf GTI', 'motorcycle').length, 0);
    assert.equal(searchVehicles('Golf GTI', 'car')[0].make, 'Volkswagen');
  });

  it('finds a car by make and model, with its body style', () => {
    const entry = findEntry('car', 'Volkswagen', 'Tiguan')!;
    assert.equal(entry.bodyStyle, 'suv');
    assert.equal(entry.type, 'car');
  });

  it('flags electric vehicles, which have no tach', () => {
    assert.equal(isElectric(findEntry('car', 'Tesla', 'Model 3')!), true);
    assert.equal(isElectric(findEntry('motorcycle', 'Zero', 'SR/F')!), true);
    assert.equal(isElectric(findEntry('car', 'Toyota', 'Corolla')!), false);
  });

  it('lists years newest first and never past next year', () => {
    const entry = findEntry('motorcycle', 'Honda', 'CB650R')!;
    const years = yearsFor(entry);
    assert.ok(years[0] >= years[years.length - 1]);
    assert.ok(years[0] <= new Date().getFullYear() + 1);
  });
});

describe('slippy map maths', () => {
  it('places the prime meridian at the middle of the world', () => {
    assert.equal(lonToTileX(0, 1), 1);
  });

  it('places the equator at the middle of the world', () => {
    assert.equal(Math.round(latToTileY(0, 1)), 1);
  });

  it('covers the viewport with tiles centred on the fix', () => {
    const tiles = tilesAround(getMapStyle('dark'), 45.9432, 24.9668, 15, 300);
    assert.ok(tiles.length >= 9);
    assert.ok(tiles.every((t) => t.url.includes('/15/')));
    // At least one tile straddles the centre of the view.
    assert.ok(tiles.some((t) => t.dx <= 0 && t.dx + 256 >= 0 && t.dy <= 0 && t.dy + 256 >= 0));
  });

  it('returns nothing for the offline style', () => {
    assert.deepEqual(tilesAround(getMapStyle('none'), 45, 25, 15, 300), []);
  });
});

describe('unit formatting', () => {
  it('converts speed and temperature', () => {
    assert.equal(Math.round(speedIn('imperial', 100)!), 62);
    assert.equal(tempIn('imperial', 100), 212);
    assert.equal(Math.round(distanceIn('imperial', 10)), 6);
  });

  it('renders missing values as an em dash, never as zero', () => {
    assert.equal(num(null), '—');
    assert.equal(num(undefined, 1), '—');
    assert.equal(num(Number.NaN), '—');
    assert.equal(num(12.34, 1), '12.3');
  });

  it('shows N for neutral only when stopped', () => {
    assert.equal(gearLabel(null, false), 'N');
    assert.equal(gearLabel(null, true), '—');
    assert.equal(gearLabel(3, true), '3');
  });

  it('formats durations and compass points', () => {
    assert.equal(duration(65), '1:05');
    assert.equal(duration(3725), '1:02:05');
    assert.equal(compass(0), 'N');
    assert.equal(compass(95), 'E');
    assert.equal(compass(null), '—');
  });
});

describe('colour helpers', () => {
  it('parses short hex and applies alpha', () => {
    assert.equal(rgba('#0f8', 0.5), 'rgba(0, 255, 136, 0.5)');
  });

  it('mixes toward a target', () => {
    assert.equal(toHex(mix('#000000', '#FFFFFF', 0.5)), '#808080');
  });

  it('reports luminance for contrast decisions', () => {
    assert.ok(luminance('#FFFFFF') > 0.9);
    assert.ok(luminance('#000000') < 0.1);
  });

  it('builds accents from a hue', () => {
    assert.equal(hsl(0, 1, 0.5), '#FF0000');
  });
});

describe('warning lamps', () => {
  const thresholds: WarningThresholds = {
    coolantHighC: 110,
    oilTempHighC: 125,
    oilPressureLowBar: 0.8,
    batteryLowV: 11.8,
    fuelLowPct: 12,
    speedAlertKph: null,
  };
  const channels = new Set<keyof Telemetry>(['coolantC', 'oilPressureBar', 'rpm', 'fuelPct']);

  it('keeps every lamp present but unmonitored with no data source', () => {
    const lamps = computeWarnings(emptyTelemetry, thresholds, new Set());
    assert.equal(lamps.length, 7);
    assert.ok(lamps.every((l) => !l.active));
    assert.ok(lamps.every((l) => !l.monitored));
  });

  it('lights the coolant lamp above the threshold', () => {
    const lamps = computeWarnings(
      { ...emptyTelemetry, coolantC: 118 },
      thresholds,
      channels,
    );
    const coolant = lamps.find((l) => l.id === 'coolant')!;
    assert.equal(coolant.active, true);
    assert.equal(coolant.severity, 'danger');
  });

  it('ignores low oil pressure at rest, flags it under load', () => {
    const stopped = computeWarnings(
      { ...emptyTelemetry, oilPressureBar: 0.2, rpm: 0 },
      thresholds,
      channels,
    );
    assert.equal(stopped.find((l) => l.id === 'oilPressure')!.active, false);

    const running = computeWarnings(
      { ...emptyTelemetry, oilPressureBar: 0.2, rpm: 3200 },
      thresholds,
      channels,
    );
    assert.equal(running.find((l) => l.id === 'oilPressure')!.active, true);
  });

  it('treats a stored fault code as a check-engine light', () => {
    const lamps = computeWarnings(
      { ...emptyTelemetry, dtcCodes: ['P0133'] },
      thresholds,
      channels,
    );
    assert.equal(lamps.find((l) => l.id === 'mil')!.active, true);
  });
});

describe('artwork frame selection', () => {
  const photo = (angle: VehicleAngle, assetUri?: string, error?: string) => ({
    angle,
    sourceUri: `file:///src-${angle}.jpg`,
    assetUri,
    error,
  });

  it('renders the side view on the dash when there is one', () => {
    const photos = [photo('front', 'file:///front.png'), photo('side', 'file:///side.png')];
    assert.equal(heroFrom(photos), 'file:///side.png');
  });

  it('falls back to any processed angle when the side shot failed', () => {
    const photos = [photo('side', undefined, 'timed out'), photo('rear', 'file:///rear.png')];
    assert.equal(heroFrom(photos), 'file:///rear.png');
  });

  it('has no hero when nothing processed', () => {
    assert.equal(heroFrom([photo('side', undefined, 'failed')]), undefined);
    assert.deepEqual(turntableFrom([photo('side', undefined, 'failed')]), []);
  });

  it('orders the turntable front → side and skips missing angles', () => {
    const photos = [
      photo('rear', 'file:///rear.png'),
      photo('side', 'file:///side.png'),
      photo('front', 'file:///front.png'),
    ];
    // rear is not part of the intro; front leads, side lands.
    assert.deepEqual(turntableFrom(photos), ['file:///front.png', 'file:///side.png']);
  });

  it('degrades to a single frame when only the side view exists', () => {
    assert.deepEqual(turntableFrom([photo('side', 'file:///side.png')]), ['file:///side.png']);
  });
});
