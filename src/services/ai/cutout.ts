/**
 * Turns a bike render/photo with a flat background into a real transparent PNG.
 *
 * Image models are unreliable at emitting real alpha, so every prompt asks for a
 * flat chroma-green field instead and the keying happens here, on device:
 *
 *   1. sample the border to learn the actual background colour,
 *   2. flood-fill inwards from the edges so a green *bike* survives keying,
 *   3. feather the boundary and suppress colour spill,
 *   4. trim to the subject's bounding box.
 *
 * Skia is imported lazily: if the native module is missing (Expo Go), the caller
 * still gets the original image back with `keyed: false` and the dash renders it
 * with a blend-mode fallback.
 */

import type { SkImage } from '@shopify/react-native-skia';

export interface CutoutOptions {
  /** Longest edge of the processed image; larger inputs are downscaled first. */
  maxSize?: number;
  /** 0..1 — how close to the background colour a pixel must be to be removed. */
  tolerance?: number;
  /** Extra transparent margin kept around the subject, as a fraction of size. */
  padding?: number;
}

export interface CutoutResult {
  /** Base64 PNG (no data: prefix). */
  base64: string;
  width: number;
  height: number;
  /** False when Skia was unavailable and the source was passed through. */
  keyed: boolean;
  /** Fraction of pixels that survived — a sanity signal for the UI. */
  subjectRatio: number;
}

export async function removeBackground(
  sourceBase64: string,
  options: CutoutOptions = {},
): Promise<CutoutResult> {
  const maxSize = options.maxSize ?? 1280;
  const tolerance = options.tolerance ?? 0.16;
  const padding = options.padding ?? 0.02;

  const skia = await loadSkia();
  if (!skia) {
    return { base64: sourceBase64, width: 0, height: 0, keyed: false, subjectRatio: 1 };
  }
  const { Skia, AlphaType, ColorType, ImageFormat, FilterMode, MipmapMode } = skia;

  const decoded = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(sourceBase64));
  if (!decoded) throw new Error('Could not decode the generated image.');

  const image = downscale(decoded, maxSize, { Skia, FilterMode, MipmapMode });
  const width = image.width();
  const height = image.height();

  const info = { width, height, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul };
  const raw = image.readPixels(0, 0, info);
  if (!raw || !(raw instanceof Uint8Array)) throw new Error('Could not read image pixels.');
  const pixels = raw;

  const key = sampleBackground(pixels, width, height);
  const tol = tolerance * 441; // 441 ≈ max euclidean distance in RGB space
  const soft = tol * 1.9;

  const alpha = keyBackground(pixels, width, height, key, tol, soft);
  applyAlpha(pixels, alpha, key);

  const box = boundingBox(alpha, width, height, padding);
  const cropped = cropRGBA(pixels, width, height, box);

  const outInfo = {
    width: box.w,
    height: box.h,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  };
  const out = Skia.Image.MakeImage(outInfo, Skia.Data.fromBytes(cropped), box.w * 4);
  if (!out) throw new Error('Could not rebuild the cut-out image.');

  let opaque = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] > 8) opaque++;

  return {
    base64: out.encodeToBase64(ImageFormat.PNG, 100),
    width: box.w,
    height: box.h,
    keyed: true,
    subjectRatio: opaque / (width * height),
  };
}

/* -------------------------------------------------------------------------- */

type SkiaModule = typeof import('@shopify/react-native-skia');

let skiaPromise: Promise<SkiaModule | null> | null = null;

export function loadSkia(): Promise<SkiaModule | null> {
  if (!skiaPromise) {
    skiaPromise = import('@shopify/react-native-skia')
      .then((mod) => (mod?.Skia ? mod : null))
      .catch(() => null);
  }
  return skiaPromise;
}

function downscale(
  image: SkImage,
  maxSize: number,
  skia: Pick<SkiaModule, 'Skia' | 'FilterMode' | 'MipmapMode'>,
): SkImage {
  const w = image.width();
  const h = image.height();
  const longest = Math.max(w, h);
  if (longest <= maxSize) return image;

  const scale = maxSize / longest;
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const surface = skia.Skia.Surface.Make(tw, th) ?? skia.Skia.Surface.MakeOffscreen(tw, th);
  if (!surface) return image;

  const canvas = surface.getCanvas();
  canvas.drawImageRectOptions(
    image,
    skia.Skia.XYWHRect(0, 0, w, h),
    skia.Skia.XYWHRect(0, 0, tw, th),
    skia.FilterMode.Linear,
    skia.MipmapMode.Linear,
  );
  surface.flush();
  return surface.makeImageSnapshot();
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Median of the border ring — robust against a logo or vignette in one corner. */
function sampleBackground(px: Uint8Array, w: number, h: number): RGB {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const step = Math.max(1, Math.floor(Math.max(w, h) / 128));
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(px[i]);
    gs.push(px[i + 1]);
    bs.push(px[i + 2]);
  };
  for (let x = 0; x < w; x += step) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    push(0, y);
    push(w - 1, y);
  }
  const median = (arr: number[]) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)] ?? 0;
  return { r: median(rs), g: median(gs), b: median(bs) };
}

function dist(px: Uint8Array, i: number, key: RGB): number {
  const dr = px[i] - key.r;
  const dg = px[i + 1] - key.g;
  const db = px[i + 2] - key.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Flood fill from every border pixel. Only background connected to the frame is
 * removed, so a green tank or a white fairing in the middle of the bike stays.
 */
function keyBackground(
  px: Uint8Array,
  w: number,
  h: number,
  key: RGB,
  tol: number,
  soft: number,
): Uint8Array {
  const n = w * h;
  const alpha = new Uint8Array(n).fill(255);
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  const enqueue = (idx: number) => {
    if (visited[idx]) return;
    const d = dist(px, idx * 4, key);
    if (d > soft) return;
    visited[idx] = 1;
    // Fully transparent inside the tolerance, feathered out to `soft`.
    alpha[idx] = d <= tol ? 0 : Math.round(255 * Math.min(1, (d - tol) / (soft - tol)));
    if (d <= soft) queue[tail++] = idx;
  };

  for (let x = 0; x < w; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    enqueue(y * w);
    enqueue(y * w + w - 1);
  }

  while (head < tail) {
    const idx = queue[head++];
    // Do not expand out of a feathered edge pixel — it is already the boundary.
    if (alpha[idx] > 0) continue;
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0) enqueue(idx - 1);
    if (x < w - 1) enqueue(idx + 1);
    if (y > 0) enqueue(idx - w);
    if (y < h - 1) enqueue(idx + w);
  }
  return alpha;
}

/** Writes the alpha channel and pulls colour spill out of semi-transparent edges. */
function applyAlpha(px: Uint8Array, alpha: Uint8Array, key: RGB): void {
  const keyIsGreen = key.g > key.r + 30 && key.g > key.b + 30;
  for (let i = 0; i < alpha.length; i++) {
    const p = i * 4;
    px[p + 3] = alpha[i];
    if (keyIsGreen && alpha[i] > 0) {
      const cap = Math.max(px[p], px[p + 2]);
      if (px[p + 1] > cap) {
        // Blend the excess green back toward the neighbouring channels.
        px[p + 1] = Math.round(cap + (px[p + 1] - cap) * 0.25);
      }
    }
  }
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boundingBox(alpha: Uint8Array, w: number, h: number, padding: number): Box {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (alpha[row + x] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w, h };

  const padPx = Math.round(Math.max(w, h) * padding);
  const x = Math.max(0, minX - padPx);
  const y = Math.max(0, minY - padPx);
  return {
    x,
    y,
    w: Math.min(w, maxX + padPx + 1) - x,
    h: Math.min(h, maxY + padPx + 1) - y,
  };
}

function cropRGBA(px: Uint8Array, w: number, _h: number, box: Box): Uint8Array {
  if (box.x === 0 && box.y === 0 && box.w === w) return px;
  const out = new Uint8Array(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const src = ((y + box.y) * w + box.x) * 4;
    out.set(px.subarray(src, src + box.w * 4), y * box.w * 4);
  }
  return out;
}
