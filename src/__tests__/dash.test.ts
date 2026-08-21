import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findEntry, searchBikes, yearsFor } from '../data/motorcycles';
import { getMapStyle, latToTileY, lonToTileX, tilesAround } from '../services/map/tiles';
import { computeWarnings } from '../services/warnings';
import { emptyTelemetry } from '../state/types';
import type { Telemetry, WarningThresholds } from '../state/types';
import { hsl, luminance, mix, rgba, toHex } from '../utils/color';
import { compass, distanceIn, duration, gearLabel, num, speedIn, tempIn } from '../utils/format';

describe('bike catalogue search', () => {
  it('matches a full label', () => {
    assert.equal(searchBikes('Yamaha MT-09')[0].model, 'MT-09');
  });

  it('matches a squashed model code', () => {
    assert.equal(searchBikes('mt09')[0].label, 'Yamaha MT-09');
  });

  it('matches on make alone', () => {
    assert.ok(searchBikes('ducati').every((b) => b.make === 'Ducati'));
  });

  it('returns nothing for an empty query', () => {
    assert.deepEqual(searchBikes('   '), []);
  });

  it('lists years newest first and never past next year', () => {
    const entry = findEntry('Honda', 'CB650R')!;
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
