/**
 * Simulated ECU stream.
 *
 * Lets a rider see the full dash — tach, gear, temperatures, warnings — before
 * buying a dongle, and gives us something deterministic to develop against.
 * It is always labelled DEMO on screen so it can never be mistaken for live data.
 */

import { useLiveStore } from '../../state/liveStore';
import { BikeProfile, Telemetry } from '../../state/types';

const TICK_MS = 100;

interface DemoState {
  t: number;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  coolant: number;
  oilTemp: number;
  fuel: number;
  lean: number;
}

class DemoTransport {
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: DemoState = {
    t: 0,
    speed: 0,
    rpm: 1100,
    gear: 1,
    throttle: 0,
    coolant: 22,
    oilTemp: 20,
    fuel: 86,
    lean: 0,
  };

  get running(): boolean {
    return this.timer != null;
  }

  start(bike: BikeProfile | null): void {
    if (this.timer) return;
    const redline = bike?.redlineRpm || 11_000;
    const topSpeed = bike?.maxSpeedKph || 220;

    const live = useLiveStore.getState();
    live.setTransport('demo', 'Simulated ECU', null);
    live.setConnection('connected', { connectionError: null });
    live.ingest({}, [
      'rpm',
      'gear',
      'throttlePct',
      'coolantC',
      'oilTempC',
      'oilPressureBar',
      'fuelPct',
      'batteryV',
      'engineLoadPct',
      'intakeC',
      'ambientC',
    ]);

    this.timer = setInterval(() => {
      const patch = this.step(redline, topSpeed);
      useLiveStore.getState().ingest(patch);
    }, TICK_MS);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    const live = useLiveStore.getState();
    live.setTransport('none');
    live.setConnection('idle');
    live.resetTelemetry();
    this.state = {
      t: 0,
      speed: 0,
      rpm: 1100,
      gear: 1,
      throttle: 0,
      coolant: 22,
      oilTemp: 20,
      fuel: 86,
      lean: 0,
    };
  }

  private step(redline: number, topSpeed: number): Partial<Telemetry> {
    const s = this.state;
    s.t += TICK_MS / 1000;

    // A lap-shaped throttle trace: hard drive, short brake, corner, repeat.
    const phase = (s.t % 46) / 46;
    const target =
      phase < 0.35
        ? 0.55 + 0.45 * Math.sin(phase * Math.PI * 3)
        : phase < 0.45
          ? 0
          : phase < 0.7
            ? 0.35 + 0.2 * Math.sin(phase * Math.PI * 6)
            : phase < 0.8
              ? 0.05
              : 0.85;

    s.throttle += (target * 100 - s.throttle) * 0.12;

    const drag = (s.speed / topSpeed) ** 2 * 0.9;
    const drive = (s.throttle / 100) * 1.7 * (1 - s.speed / (topSpeed * 1.15));
    const brake = s.throttle < 5 && s.speed > 0 ? 0.9 : 0;
    s.speed = Math.max(0, s.speed + (drive - drag - brake) * 3.2);

    // Top-of-gear speed as a fraction of the bike's top speed, index = gear.
    const gearRatios = [0, 0.16, 0.26, 0.37, 0.5, 0.66, 1];
    const frac = s.speed / topSpeed;
    let gear = 6;
    for (let i = 1; i <= 6; i++) {
      if (frac < gearRatios[i]) {
        gear = i;
        break;
      }
    }
    s.gear = gear;

    const gearTop = gearRatios[gear] * topSpeed;
    const gearBottom = gearRatios[gear - 1] * topSpeed;
    const inGear = Math.min(1, Math.max(0, (s.speed - gearBottom) / Math.max(1, gearTop - gearBottom)));
    const targetRpm = 1100 + inGear * (redline * 0.93 - 1100) + (s.throttle / 100) * 600;
    s.rpm += (targetRpm - s.rpm) * 0.25;

    // Thermals drift toward an operating point that depends on load.
    const load = 0.35 + (s.throttle / 100) * 0.55;
    s.coolant += ((78 + load * 26 - s.coolant) * 0.004);
    s.oilTemp += ((72 + load * 34 - s.oilTemp) * 0.003);
    s.fuel = Math.max(0, s.fuel - 0.0009 * (0.4 + s.throttle / 100));
    s.lean = Math.sin(s.t * 0.55) * (18 + 22 * Math.sin(s.t * 0.13));

    const oilPressure = 0.9 + (s.rpm / redline) * 3.4;

    return {
      speedKph: Math.round(s.speed * 10) / 10,
      speedSource: 'demo',
      rpm: Math.round(s.rpm),
      gear: s.gear,
      throttlePct: Math.round(s.throttle),
      engineLoadPct: Math.round(load * 100),
      coolantC: Math.round(s.coolant * 10) / 10,
      oilTempC: Math.round(s.oilTemp * 10) / 10,
      oilPressureBar: Math.round(oilPressure * 100) / 100,
      fuelPct: Math.round(s.fuel * 10) / 10,
      fuelRateLph: Math.round((1.2 + (s.throttle / 100) * 16) * 10) / 10,
      batteryV: Math.round((13.9 + Math.sin(s.t * 0.7) * 0.25) * 100) / 100,
      intakeC: Math.round(24 + load * 12),
      ambientC: 21,
      leanDeg: Math.round(s.lean * 10) / 10,
      mil: false,
      dtcCodes: [],
    };
  }
}

export const demoTransport = new DemoTransport();
