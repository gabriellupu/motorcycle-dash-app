import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CUSTOM_PID_PRESETS,
  GearLearner,
  STANDARD_PIDS,
  customToPidSpec,
  estimateGear,
  parseDtcs,
  parseObdResponse,
  parseSupportedPids,
} from '../services/ble/obd';

const pid = (id: string) => STANDARD_PIDS.find((p) => p.pid === id)!;

describe('parseObdResponse', () => {
  it('parses a clean single frame', () => {
    assert.deepEqual(parseObdResponse('410C1AF8\r>'), { pid: '010C', bytes: [0x1a, 0xf8] });
  });

  it('tolerates spaces, echo and line noise', () => {
    assert.deepEqual(parseObdResponse('\r\n41 0D 3C \r\n>'), { pid: '010D', bytes: [0x3c] });
  });

  it('skips an ISO-TP length prefix', () => {
    assert.deepEqual(parseObdResponse('03410C0FA0'), { pid: '010C', bytes: [0x0f, 0xa0] });
  });

  it('returns null for NO DATA and error replies', () => {
    assert.equal(parseObdResponse('NO DATA\r>'), null);
    assert.equal(parseObdResponse('CAN ERROR'), null);
    assert.equal(parseObdResponse('?'), null);
  });
});

describe('standard PID decoding', () => {
  it('decodes RPM as (A*256+B)/4', () => {
    assert.equal(pid('010C').decode([0x1a, 0xf8]), 1726);
  });

  it('decodes speed straight from A', () => {
    assert.equal(pid('010D').decode([0x64]), 100);
  });

  it('decodes coolant with the -40 offset', () => {
    assert.equal(pid('0105').decode([0x7b]), 83);
  });

  it('decodes control module voltage in millivolts', () => {
    assert.equal(pid('0142').decode([0x35, 0x28]), 13.608);
  });

  it('returns null when the frame is too short', () => {
    assert.equal(pid('010C').decode([]), null);
    assert.equal(pid('010C').decode([0x1a]), null);
  });
});

describe('custom PIDs', () => {
  it('applies scale and offset to byte A', () => {
    const spec = customToPidSpec(CUSTOM_PID_PRESETS[0]);
    assert.equal(spec.channel, 'oilPressureBar');
    assert.equal(Number(spec.decode([32])!.toFixed(2)), 3.2);
  });

  it('supports a 16-bit source', () => {
    const spec = customToPidSpec({
      ...CUSTOM_PID_PRESETS[0],
      id: 'ab',
      source: 'AB',
      scale: 0.01,
      offset: 1,
    });
    assert.equal(Number(spec.decode([0x01, 0x00])!.toFixed(2)), 3.56);
  });
});

describe('parseDtcs', () => {
  it('decodes stored codes and drops padding', () => {
    assert.deepEqual(parseDtcs('4301330000'), ['P0133']);
  });

  it('decodes the letter from the top two bits', () => {
    assert.deepEqual(parseDtcs('43C123'.padEnd(6, '0')), ['U0123']);
  });

  it('ignores replies that are not mode 03', () => {
    assert.deepEqual(parseDtcs('410C1AF8'), []);
  });
});

describe('parseSupportedPids', () => {
  it('expands the 0100 bitmask', () => {
    // 0x80 in the first byte = PID 01 supported, and nothing else.
    assert.deepEqual(parseSupportedPids({ pid: '0100', bytes: [0x80, 0x00, 0x00, 0x00] }), ['0101']);
  });

  it('offsets by the queried base pid', () => {
    assert.deepEqual(parseSupportedPids({ pid: '0120', bytes: [0x80, 0, 0, 0] }), ['0121']);
  });
});

describe('gear estimation', () => {
  it('picks the closest learned ratio', () => {
    const ratios = [100, 70, 55, 45, 38, 32];
    assert.equal(estimateGear(5500, 100, ratios), 3); // 55 rpm per km/h
  });

  it('refuses to guess when nothing matches', () => {
    assert.equal(estimateGear(5500, 100, [20, 15]), null);
  });

  it('refuses to guess below walking pace', () => {
    assert.equal(estimateGear(3000, 2, [100]), null);
  });

  it('learns ratios from a steady pull', () => {
    const learner = new GearLearner();
    for (let i = 0; i < 20; i++) learner.observe(6000, 100);
    assert.equal(learner.gear(6000, 100), 1);
  });
});
