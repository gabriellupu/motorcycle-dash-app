# Moto Dash

A digital instrument cluster for your motorcycle, built with React Native (Expo, SDK 57).
It runs on a phone or tablet clamped to the bars: your bike rendered on one side, speed and
telemetry on the other, no scrolling in either orientation.

- **Your actual bike on the dash.** Pick make / model / year and let Gemini render it, or
  photograph your own bike and let the AI cut it out. Either way the app keys the background
  out on device, so the artwork lands on the dash with real transparency.
- **Works with nothing plugged in.** GPS gives speed, heading, altitude and a live map that
  fades into the cluster. Channels the phone cannot know stay dashed rather than faked.
- **Full telemetry over Bluetooth.** Any ELM327-style OBD adapter adds RPM, gear, throttle,
  coolant and oil temperature, battery voltage, fuel level and stored fault codes.
- **Five themes plus a theme builder**, portrait and landscape layouts, and a settings screen
  that exposes essentially every knob.

---

## Running it

```bash
npm install
npm start          # Metro; press a / i, or scan the QR
```

**Expo Go** runs everything except Bluetooth (`react-native-ble-plx` is a native module). The
app detects this and says so — GPS, artwork generation, themes and Demo mode all work.

For the full thing, build a dev client:

```bash
npx expo run:android      # or: npx expo run:ios  (macOS)
# or EAS: npx eas build --profile development --platform android
```

`npm run web` also works and is handy for checking layouts and themes in a browser, but it is a
preview only: Bluetooth and the Skia-based cut-out are native-only, and the map's radial mask
falls back to edge gradients there.

Checks:

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test over the pure modules (41 tests)
npm run check       # both
```

---

## Onboarding

1. **Welcome** — the vector bike rotates in; you can skip straight to the dash.
2. **Bike** — forgiving autocomplete over a bundled catalogue (`mt09`, `yam mt`, `Yamaha MT-09`
   all match), or hand-enter anything exotic. The entry sets tach scale, redline and top speed.
3. **Artwork** — AI render, your own photo, or the built-in vector bike (see below).
4. **Connection** — scan and pair an OBD adapter, run Demo data, or skip and ride on GPS.
   Skipping is a first-class choice and the copy says exactly what you lose.
5. **Look** — pick a theme, units and which side the bike sits on, then the ignition sequence
   runs: lamp self-test, gauge sweep, bike rotating into its dock, and the dash takes over.

## The artwork pipeline

Image models are unreliable at emitting real alpha, so the app never asks for it. Every prompt
requests the bike on a flat chroma-green field, and `src/services/ai/cutout.ts` does the keying
locally with Skia:

1. sample the border to learn the actual background colour,
2. flood-fill inwards from the edges, so a *green bike* survives keying,
3. feather the boundary and suppress green spill on edge pixels,
4. trim to the subject's bounding box and re-encode as a transparent PNG.

Add a Gemini API key in onboarding or Settings → AI artwork. It is stored on the device only
(AsyncStorage) and used solely for generating your bike. Model is selectable —
`gemini-3.1-flash-image` by default — and the client speaks both the Interactions API and the
classic `:generateContent` endpoint, falling back automatically depending on how the key is
provisioned. With no key, the built-in vector bike is used and everything else still works.

Turning on **3D turntable** renders three angles (left, three-quarter, front) so the intro
rotates real frames instead of a perspective transform. It costs three generations.

## Bluetooth / OBD

`src/services/ble/BleService.ts` talks to serial-over-BLE adapters (Vgate, Veepeak, Konnwei,
OBDLink and the usual clones). It auto-detects the notify/write characteristic pair, runs the
ELM327 bring-up (`ATZ`, `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATSP0`, `0100`), reads the supported-PID
bitmasks so it only polls what the ECU answers, and then round-robins the channels with a
priority per PID. Mode 03 is polled occasionally for fault codes.

Gear is usually not exposed on bikes, so `GearLearner` clusters the observed rpm/speed ratios
while you ride and reports the gear once the ratios are stable.

**Oil pressure is not standard OBD-II.** Bikes that expose it use a manufacturer PID, so
Settings → Data → Custom PIDs lets you add one (PID, byte source, scale, offset, target
channel) with a couple of presets to start from. Until then that tile reads `—`.

No adapter to hand? **Demo data** drives a simulated lap through the whole dash. It is always
labelled `DEMO` in the status row so it can never be mistaken for live data.

## Layouts

- **Portrait** — status row, shift-light strip, big speedometer, then the bike beside the gear
  indicator, lean meter and map, then telemetry tiles and the lamp row.
- **Landscape** — bike and map in one column, speedometer column in the middle, telemetry and
  lamps in the third. Left/right column order follows the "bike side" setting.

Both are sized from the viewport so nothing scrolls; only Settings scrolls.

## Themes

`ultramodern` (glass and bloom), `minimal` (one enormous number), `technical` (monospace,
segment gauges, every channel), `retro` (amber cluster, analog needles, scanlines and grain)
and `daylight` (high-contrast light). A theme is a single object — colours, typography, shape,
effects and gauge style — so the **custom theme builder** in Settings (base look + accent hue)
produces a complete theme, and adding a whole new one means one more entry in
`src/theme/themes.ts` or a `registerTheme()` call at runtime.

The same `<Gauge>` renders as a swept arc, a segment ring, a needle dial or a flat bar
depending on the active theme; screens never branch on which.

## Project layout

```
src/
  components/
    bike/VectorBike.tsx        built-in schematic motorcycle (SVG)
    dash/                      Gauge, RpmBar, BikeStage, MapPreview, WarningLights, widgets
    settings/ThemePicker.tsx   theme gallery, each card in its own theme
    ui/                        Txt, Panel, Controls, Autocomplete, ScreenBackground
  data/motorcycles.ts          bundled catalogue + fuzzy search
  hooks/                       useLayout, useDashSession (GPS/IMU/BLE/wake-lock/orientation)
  navigation/                  tiny route store + cross-fade navigator
  screens/                     Dash, Ignition, Settings, onboarding flow
  services/
    ai/                        gemini client, prompts, chroma-key cutout, asset store
    ble/                       BleService, ELM327/OBD protocol, demo transport
    gps/, sensors/, map/       location, lean angle, slippy-map tiles
    warnings.ts                telemetry → cluster lamps
  state/                       zustand: persisted app store + live telemetry store
  theme/                       theme contract, built-ins, custom builder, provider
  utils/                       colour, formatting/units, base64
```

## Map

The map preview is drawn from raster XYZ tiles (`src/services/map/tiles.ts`) rather than an
embedded map SDK: no API key, any provider, and it can be masked with a radial gradient so the
edges dissolve into the dash. Style is selectable (dark / light / voyager / OSM / offline
vector grid), attribution is rendered on the preview, and a GPS trail is drawn over the tiles.
The offline grid keeps the pod alive with no connectivity.

## Privacy

Telemetry, position and photos stay on the device. The only outbound requests are map tiles to
the provider you select and — when you generate artwork — the prompt and any photo you chose
to the Gemini API with your own key.

## Notes and limits

- Bluetooth needs a development build; Expo Go cannot load the native module.
- Lean angle comes from the phone's accelerometer, so it measures the *phone*: use
  Settings → Level with the bike upright to zero the mount angle.
- The bundled catalogue is a curated subset (~150 models). Anything missing can be entered by
  hand, and the gauge scales are editable per bike.
- Speed prefers the ECU when it reports and falls back to GPS; the source is printed under the
  speed readout.
