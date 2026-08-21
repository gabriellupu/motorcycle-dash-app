# Moto Dash

A digital instrument cluster for your **motorcycle or your car**, built with React Native
(Expo, SDK 57). It runs on a phone or tablet clamped to the bars or stuck to the windscreen:
your vehicle rendered on one side, speed and telemetry on the other, no scrolling in either
orientation.

- **Your actual vehicle on the dash.** Onboarding walks you through photographing it from
  several angles — side, front three-quarter, front and rear — and the AI cuts each shot out.
  Yours is not a showroom vehicle: wheels, paint, exhausts, light bars and stickers all show
  up, because the artwork comes from your own photos rather than a catalogue render. The
  background keying happens on device, so the artwork lands on the dash with real transparency.
- **Works with nothing plugged in.** GPS gives speed, heading, altitude and a live map that
  fades into the cluster. Channels the phone cannot know stay dashed rather than faked.
- **Full telemetry over Bluetooth.** Any ELM327-style OBD adapter adds RPM, gear, throttle,
  coolant and oil temperature, battery voltage, fuel level and stored fault codes.
- **Bikes and cars share one dash.** The vehicle type decides the catalogue, the stand-in
  silhouette and which widgets earn their place: lean angle for a bike, a lateral-G ball for a
  car, and no tach at all for an EV.
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
npm test            # node:test over the pure modules (49 tests)
npm run check       # both
```

---

## Onboarding

1. **Welcome** — the vector bike rotates in; you can skip straight to the dash.
2. **Bike or car** — two big cards, each drawn with the built-in silhouette. The choice flows
   through the whole app.
3. **Model** — forgiving autocomplete over the bundled catalogue for that type (`mt09`,
   `yam mt`, `Yamaha MT-09` all match; `golf gti` finds the Volkswagen), or hand-enter anything
   exotic, plus a free-text note for colour and modifications. Sets tach scale, redline and
   top speed.
4. **Photos** — the step that makes the dash yours. A slot per angle (side, front 3/4, front,
   rear), each with a plan-view diagram showing where to stand, and camera or library for each.
   The side shot is required — it is what the dash renders — and the rest sharpen the AI's
   picture of your vehicle and feed the 3D intro. Two modes: *keep my vehicle exactly* (cut the
   background out of your photo, every modification survives) or *clean studio render* (a
   studio shot built from your photos). If you have no photos to hand there are honest
   fallbacks: a catalogue render, or the built-in silhouette, both revisitable from Settings.
5. **Connection** — scan and pair an OBD adapter, run Demo data, or skip and ride on GPS.
   Skipping is a first-class choice and the copy says exactly what you lose.
6. **Look** — pick a theme, units and which side the vehicle sits on, then the ignition
   sequence runs: lamp self-test, gauge sweep, vehicle rotating into its dock, dash takes over.

## The artwork pipeline

Image models are unreliable at emitting real alpha, so the app never asks for it. Every prompt
requests the vehicle on a flat chroma-green field, and `src/services/ai/cutout.ts` does the
keying locally with Skia:

1. sample the border to learn the actual background colour,
2. flood-fill inwards from the edges, so a *green vehicle* survives keying,
3. feather the boundary and suppress green spill on edge pixels,
4. trim to the subject's bounding box and re-encode as a transparent PNG.

Each angle is processed independently: one failing does not sink the run, it just records an
error against that angle and the rest carry on. The side cut-out becomes the dash artwork, and
the front → front-3/4 → side frames become the turntable the intro rotates through. Any angle
can be re-shot later from Settings → Photos without touching the others.

Add a Gemini API key in onboarding or Settings → AI artwork. It is stored on the device only
(AsyncStorage) and used solely for generating your vehicle artwork. Model is selectable —
`gemini-3.1-flash-image` by default — and the client speaks both the Interactions API and the
classic `:generateContent` endpoint, falling back automatically depending on how the key is
provisioned. With no key, the built-in vector silhouette is used and everything else still works.

## Bluetooth / OBD

`src/services/ble/BleService.ts` talks to serial-over-BLE adapters (Vgate, Veepeak, Konnwei,
OBDLink and the usual clones). It auto-detects the notify/write characteristic pair, runs the
ELM327 bring-up (`ATZ`, `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATSP0`, `0100`), reads the supported-PID
bitmasks so it only polls what the ECU answers, and then round-robins the channels with a
priority per PID. Mode 03 is polled occasionally for fault codes.

Cars have far better standard-PID coverage than bikes; the app polls the supported set either
way. Gear is usually not exposed, so `GearLearner` clusters the observed rpm/speed ratios while
you drive and reports the gear once the ratios are stable.

**Oil pressure is not standard OBD-II.** Bikes that expose it use a manufacturer PID, so
Settings → Data → Custom PIDs lets you add one (PID, byte source, scale, offset, target
channel) with a couple of presets to start from. Until then that tile reads `—`.

No adapter to hand? **Demo data** drives a simulated lap through the whole dash. It is always
labelled `DEMO` in the status row so it can never be mistaken for live data.

## Layouts

- **Portrait** — status row, shift-light strip, big speedometer, then the vehicle beside the
  gear indicator, lean/G meter and map, then telemetry tiles and the lamp row.
- **Landscape** — vehicle and map in one column, speedometer column in the middle, telemetry
  and lamps in the third. Left/right column order follows the "vehicle side" setting.

The vehicle type changes what is worth showing: bikes get the lean meter, cars get the G ball,
and an electric vehicle drops the shift-light strip entirely rather than faking a tach.

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
    vehicle/VectorVehicle.tsx  built-in schematic bike and car silhouettes (SVG)
    vehicle/AngleDiagram.tsx   plan view showing where to stand for each photo
    dash/                      Gauge, RpmBar, VehicleStage, MapPreview, WarningLights, widgets
    settings/ThemePicker.tsx   theme gallery, each card in its own theme
    ui/                        Txt, Panel, Controls, Autocomplete, ScreenBackground
  data/vehicles.ts             bundled bike + car catalogue, fuzzy search
  hooks/                       useLayout, useDashSession (GPS/IMU/BLE/wake-lock/orientation)
  navigation/                  tiny route store + cross-fade navigator
  screens/                     Dash, Ignition, Settings, onboarding flow
  services/
    ai/                        gemini client, prompts, chroma-key cutout, frames, asset store
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
- The bundled catalogue is a curated subset (~150 motorcycles, ~130 cars). Anything missing can
  be entered by hand, and the gauge scales are editable per vehicle.
- The photo step needs a Gemini key to process shots. Without one you can still finish
  onboarding with the built-in silhouette and add photos later from Settings.
- Speed prefers the ECU when it reports and falls back to GPS; the source is printed under the
  speed readout.
