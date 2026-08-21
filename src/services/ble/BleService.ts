/**
 * Bluetooth transport for ELM327-style OBD adapters.
 *
 * react-native-ble-plx is required lazily so the app still boots (and the dash
 * still runs on GPS) inside Expo Go or on a device without the native module.
 * Everything protocol-shaped lives in `obd.ts`; this file is transport only.
 */

import { PermissionsAndroid, Platform } from 'react-native';

import { useLiveStore } from '../../state/liveStore';
import { DiscoveredDevice, Telemetry } from '../../state/types';
import { decodeBase64, encodeBase64 } from '../../utils/base64';

import {
  CustomPidSpec,
  GearLearner,
  INIT_COMMANDS,
  PidSpec,
  STANDARD_PIDS,
  SUPPORT_QUERIES,
  customToPidSpec,
  parseDtcs,
  parseObdResponse,
  parseSupportedPids,
} from './obd';

type BlePlx = typeof import('react-native-ble-plx');
type Device = import('react-native-ble-plx').Device;
type Characteristic = import('react-native-ble-plx').Characteristic;
type Subscription = import('react-native-ble-plx').Subscription;
type BleManager = import('react-native-ble-plx').BleManager;

/** Serial-style service/characteristic pairs used by common dongles. */
const KNOWN_PAIRS = [
  { service: '0000fff0-0000-1000-8000-00805f9b34fb', notify: '0000fff1', write: '0000fff2' },
  { service: '0000ffe0-0000-1000-8000-00805f9b34fb', notify: '0000ffe1', write: '0000ffe1' },
  { service: '0000ffe0-0000-1000-8000-00805f9b34fb', notify: '0000ffe1', write: '0000ffee' },
  { service: '0000fff0-0000-1000-8000-00805f9b34fb', notify: '0000fff1', write: '0000fff1' },
  { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', notify: '6e400003', write: '6e400002' },
  { service: '000018f0-0000-1000-8000-00805f9b34fb', notify: '00002af0', write: '00002af1' },
];

const NAME_HINTS = ['obd', 'elm', 'vgate', 'veepeak', 'konnwei', 'viecar', 'carista', 'obdii', 'ios-vlink'];

export interface ScanOptions {
  /** Show every advertising device, not just likely OBD adapters. */
  showAll?: boolean;
  timeoutMs?: number;
}

export interface ConnectOptions {
  customPids?: CustomPidSpec[];
  /** Poll period for the fast channels (RPM, speed, throttle). */
  pollIntervalMs?: number;
}

class BleService {
  private plx: BlePlx | null = null;
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private notifyChar: Characteristic | null = null;
  private writeChar: Characteristic | null = null;
  private monitorSub: Subscription | null = null;
  private disconnectSub: Subscription | null = null;

  private rxBuffer = '';
  private pending: {
    resolve: (value: string) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private cycle = 0;
  private activePids: PidSpec[] = [];
  private gearLearner = new GearLearner();
  private stopping = false;

  /** True when the native module is present in this binary. */
  async isAvailable(): Promise<boolean> {
    return (await this.load()) != null;
  }

  private async load(): Promise<BlePlx | null> {
    if (this.plx) return this.plx;
    try {
      const mod = (await import('react-native-ble-plx')) as BlePlx;
      if (!mod?.BleManager) return null;
      this.plx = mod;
      return mod;
    } catch {
      return null;
    }
  }

  private async getManager(): Promise<BleManager | null> {
    if (this.manager) return this.manager;
    const plx = await this.load();
    if (!plx) return null;
    try {
      this.manager = new plx.BleManager();
      return this.manager;
    } catch {
      return null;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const api = Number(Platform.Version);
    const permissions =
      api >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const result = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(result).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }

  async scan(options: ScanOptions = {}): Promise<void> {
    const live = useLiveStore.getState();
    const manager = await this.getManager();
    if (!manager) {
      live.setConnection('error', {
        connectionError:
          'Bluetooth is not available in this build. Use a development build (the dash still runs on GPS).',
      });
      return;
    }
    if (!(await this.requestPermissions())) {
      live.setConnection('error', { connectionError: 'Bluetooth permission was denied.' });
      return;
    }

    live.setDevices([]);
    live.setConnection('scanning', { connectionError: null });

    const found = new Map<string, DiscoveredDevice>();
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        this.stopScan();
        useLiveStore
          .getState()
          .setConnection('error', { connectionError: humanizeBleError(error.message) });
        return;
      }
      if (!device) return;
      const name = device.name ?? device.localName ?? '';
      const looksLikeObd = NAME_HINTS.some((hint) => name.toLowerCase().includes(hint));
      if (!options.showAll && !looksLikeObd) return;
      if (!name && !options.showAll) return;

      found.set(device.id, { id: device.id, name: name || 'Unnamed device', rssi: device.rssi });
      useLiveStore
        .getState()
        .setDevices([...found.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)));
    });

    setTimeout(() => {
      this.stopScan();
      const state = useLiveStore.getState();
      if (state.connection === 'scanning') state.setConnection('idle');
    }, options.timeoutMs ?? 12_000);
  }

  stopScan(): void {
    this.manager?.stopDeviceScan();
  }

  async connect(deviceId: string, options: ConnectOptions = {}): Promise<boolean> {
    const live = useLiveStore.getState();
    const manager = await this.getManager();
    if (!manager) return false;

    this.stopScan();
    this.stopping = false;
    live.setConnection('connecting', { connectionError: null });

    try {
      const device = await manager.connectToDevice(deviceId, { requestMTU: 185, timeout: 15_000 });
      await device.discoverAllServicesAndCharacteristics();
      this.device = device;

      const pair = await this.findSerialPair(device);
      if (!pair) throw new Error('This device does not expose a serial (UART) characteristic.');
      this.notifyChar = pair.notify;
      this.writeChar = pair.write;

      this.monitorSub = this.notifyChar.monitor((error, characteristic) => {
        if (error) {
          if (!this.stopping) this.handleDrop(humanizeBleError(error.message));
          return;
        }
        if (characteristic?.value) this.onData(decodeBase64(characteristic.value));
      });

      this.disconnectSub = device.onDisconnected(() => {
        if (!this.stopping) this.handleDrop('The adapter disconnected.');
      });

      live.setTransport('ble', device.name ?? 'OBD adapter', device.id);
      live.setConnection('handshaking');
      await this.initialize(options);

      live.setConnection('connected');
      this.startPolling(options.pollIntervalMs ?? 220);
      return true;
    } catch (err) {
      await this.disconnect();
      useLiveStore.getState().setConnection('error', {
        connectionError: humanizeBleError(err instanceof Error ? err.message : String(err)),
      });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopping = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.monitorSub?.remove();
    this.disconnectSub?.remove();
    this.monitorSub = null;
    this.disconnectSub = null;
    this.rejectPending(new Error('Disconnected'));

    try {
      if (this.device && (await this.device.isConnected())) await this.device.cancelConnection();
    } catch {
      // Already gone — nothing to clean up.
    }
    this.device = null;
    this.notifyChar = null;
    this.writeChar = null;
    this.activePids = [];

    const live = useLiveStore.getState();
    live.setTransport('none');
    live.setConnection('idle', { connectionError: null });
    live.resetTelemetry();
  }

  destroy(): void {
    void this.disconnect();
    this.manager?.destroy();
    this.manager = null;
  }

  /* ---------------------------------------------------------------- internals */

  private async findSerialPair(
    device: Device,
  ): Promise<{ notify: Characteristic; write: Characteristic } | null> {
    const services = await device.services();
    const all: Characteristic[] = [];
    for (const service of services) {
      all.push(...(await service.characteristics()));
    }

    const byUuid = (prefix: string) =>
      all.find((c) => c.uuid.toLowerCase().startsWith(prefix.toLowerCase()));

    for (const pair of KNOWN_PAIRS) {
      const notify = byUuid(pair.notify);
      const write = byUuid(pair.write);
      if (notify && write && (notify.isNotifiable || notify.isIndicatable)) {
        return { notify, write };
      }
    }

    // Fall back to any notifiable + writable pair in the same service.
    const notify = all.find((c) => c.isNotifiable || c.isIndicatable);
    const write = all.find(
      (c) =>
        (c.isWritableWithResponse || c.isWritableWithoutResponse) &&
        (!notify || c.serviceUUID === notify.serviceUUID),
    );
    return notify && write ? { notify, write } : null;
  }

  private onData(chunk: string): void {
    this.rxBuffer += chunk;
    if (!this.rxBuffer.includes('>')) return;
    const payload = this.rxBuffer;
    this.rxBuffer = '';
    const pending = this.pending;
    this.pending = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(payload);
    }
  }

  /** Serialised command/response — the ELM327 handles exactly one at a time. */
  private send(command: string, timeoutMs = 2500): Promise<string> {
    const run = async (): Promise<string> => {
      if (!this.writeChar) throw new Error('Not connected');
      this.rxBuffer = '';
      const payload = encodeBase64(`${command}\r`);
      const result = new Promise<string>((resolve, reject) => {
        this.pending = {
          resolve,
          reject,
          timer: setTimeout(() => {
            this.pending = null;
            reject(new Error(`Timed out waiting for "${command}"`));
          }, timeoutMs),
        };
      });

      if (this.writeChar.isWritableWithResponse) {
        await this.writeChar.writeWithResponse(payload);
      } else {
        await this.writeChar.writeWithoutResponse(payload);
      }
      const response = await result;
      useLiveStore.getState().pushBleLog(`${command} → ${response.replace(/[\r\n>]+/g, ' ').trim()}`);
      return response;
    };

    const chained = this.queue.then(run, run);
    // Keep the chain alive even when a command fails.
    this.queue = chained.catch(() => undefined);
    return chained;
  }

  private async initialize(options: ConnectOptions): Promise<void> {
    for (const step of INIT_COMMANDS) {
      try {
        await this.send(step.cmd, step.waitMs ?? 2500);
      } catch (err) {
        if (step.cmd === '0100') throw err;
        // Non-fatal AT commands: some clones do not answer every one.
      }
    }

    const supported = new Set<string>();
    for (const query of SUPPORT_QUERIES) {
      try {
        const parsed = parseObdResponse(await this.send(query, 2500));
        if (!parsed) break;
        parseSupportedPids(parsed).forEach((pid) => supported.add(pid));
      } catch {
        break;
      }
    }

    const custom = (options.customPids ?? []).map(customToPidSpec);
    const standard = supported.size
      ? STANDARD_PIDS.filter((p) => supported.has(p.pid))
      : STANDARD_PIDS;
    this.activePids = [...standard, ...custom];

    const live = useLiveStore.getState();
    live.pushBleLog(
      `Supported PIDs: ${supported.size ? [...supported].join(' ') : 'unknown (polling defaults)'}`,
    );
    live.ingest({}, this.activePids.map((p) => p.channel));
  }

  private startPolling(intervalMs: number): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.cycle = 0;

    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, intervalMs);
  }

  private polling = false;

  private async pollOnce(): Promise<void> {
    if (this.polling || !this.device) return;
    this.polling = true;
    const cycle = this.cycle++;

    try {
      const patch: Partial<Telemetry> = {};
      for (const spec of this.activePids) {
        if (cycle % spec.every !== 0) continue;
        try {
          const parsed = parseObdResponse(await this.send(spec.pid, 1200));
          if (!parsed || parsed.pid !== spec.pid) continue;
          const value = spec.decode(parsed.bytes);
          if (value != null && Number.isFinite(value)) {
            (patch as Record<string, unknown>)[spec.channel] = value;
          }
        } catch {
          // Skip this channel this cycle; a dropped frame is normal.
        }
      }

      if (patch.speedKph != null) patch.speedSource = 'obd';
      this.gearLearner.observe(
        (patch.rpm as number | undefined) ?? null,
        (patch.speedKph as number | undefined) ?? null,
      );
      if (patch.gear == null) {
        const gear = this.gearLearner.gear(
          (patch.rpm as number | undefined) ?? null,
          (patch.speedKph as number | undefined) ?? null,
        );
        if (gear != null) patch.gear = gear;
      }

      if (cycle % 40 === 0) {
        try {
          const dtcRaw = await this.send('03', 2500);
          const codes = parseDtcs(dtcRaw);
          patch.dtcCodes = codes;
          patch.mil = codes.length > 0;
        } catch {
          // Leave the previous DTC list in place.
        }
      }

      if (Object.keys(patch).length) useLiveStore.getState().ingest(patch);
    } finally {
      this.polling = false;
    }
  }

  private handleDrop(message: string): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    const live = useLiveStore.getState();
    live.setTransport('none');
    live.setConnection('error', { connectionError: message });
  }

  private rejectPending(error: Error): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending.reject(error);
    this.pending = null;
  }
}

function humanizeBleError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('powered off')) return 'Bluetooth is switched off on this device.';
  if (lower.includes('unauthorized') || lower.includes('permission')) {
    return 'Bluetooth permission is missing. Grant it in system settings.';
  }
  if (lower.includes('not found') || lower.includes('was not found')) {
    return 'The adapter is out of range or already paired to another app.';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'The adapter stopped answering. Cycle the ignition and try again.';
  }
  return message;
}

export const bleService = new BleService();
