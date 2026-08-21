/**
 * The artwork pipeline used by onboarding and by Settings → Artwork.
 *
 * For each captured angle: read the photo → ask the model to replace the
 * background with flat chroma → key that out locally → trim → save a
 * transparent PNG. One angle failing never kills the run: that angle records an
 * error, the rest carry on, and the dash falls back to the built-in silhouette
 * only if nothing survived.
 */

import { VehicleAngle, VehiclePhoto, VehicleProfile } from '../../state/types';

import { readAsBase64, saveBase64Png } from './assetStore';
import { removeBackground } from './cutout';
import { heroFrom, turntableFrom } from './frames';
import { GeminiError, generateImage } from './gemini';
import { VehicleDescriptor, cutoutPrompt, renderPrompt, restylePrompt } from './prompts';

export type ArtworkStage =
  | 'idle'
  | 'reading'
  | 'rendering'
  | 'keying'
  | 'saving'
  | 'done'
  | 'failed';

export interface ArtworkProgress {
  stage: ArtworkStage;
  /** 0..1 across the whole job. */
  progress: number;
  message: string;
  angle?: VehicleAngle;
  /** 1-based index of the angle in flight, and how many there are. */
  frame?: number;
  frameCount?: number;
}

export interface CaptureInput {
  angle: VehicleAngle;
  /** file:// URI of the rider's photo. */
  sourceUri: string;
}

export type ArtworkMode = 'photo-cutout' | 'photo-restyle' | 'render';

export interface ArtworkJob {
  vehicle: Pick<
    VehicleProfile,
    'id' | 'type' | 'make' | 'model' | 'year' | 'bodyStyle' | 'colorHint'
  >;
  apiKey: string;
  model: string;
  mode: ArtworkMode;
  /** Captured photos, one per angle (photo modes). */
  photos?: CaptureInput[];
  /** Angles to invent (render mode). */
  angles?: VehicleAngle[];
  onProgress?: (progress: ArtworkProgress) => void;
  signal?: AbortSignal;
}

export interface ArtworkResult {
  /** One entry per requested angle, carrying its cut-out or its error. */
  photos: VehiclePhoto[];
  heroUri?: string;
  /** Turntable frames, ordered front → side. */
  angleUris: string[];
  origin: NonNullable<VehicleProfile['assetOrigin']>;
  /** False when keying was skipped (no Skia) so the UI can warn about edges. */
  keyed: boolean;
  /** Angles that failed, for a "retry these" affordance. */
  failed: VehicleAngle[];
}

export async function createVehicleArtwork(job: ArtworkJob): Promise<ArtworkResult> {
  const descriptor: VehicleDescriptor = {
    type: job.vehicle.type,
    make: job.vehicle.make,
    model: job.vehicle.model,
    year: job.vehicle.year,
    bodyStyle: job.vehicle.bodyStyle,
    colorHint: job.vehicle.colorHint,
  };

  const work: CaptureInput[] =
    job.mode === 'render'
      ? (job.angles ?? ['side']).map((angle) => ({ angle, sourceUri: '' }))
      : (job.photos ?? []);

  if (work.length === 0) {
    throw new GeminiError('No photos to work from — add at least the side view.');
  }

  const report = (p: ArtworkProgress) => job.onProgress?.(p);
  const results: VehiclePhoto[] = [];
  const failed: VehicleAngle[] = [];
  let keyedAll = true;

  for (let i = 0; i < work.length; i++) {
    const { angle, sourceUri } = work[i];
    const base = i / work.length;
    const span = 1 / work.length;
    const frame = { angle, frame: i + 1, frameCount: work.length };

    try {
      throwIfAborted(job.signal);

      let photoBase64: string | undefined;
      if (job.mode !== 'render') {
        report({ stage: 'reading', progress: base, message: 'Reading your photo…', ...frame });
        photoBase64 = await readAsBase64(sourceUri);
      }

      report({
        stage: 'rendering',
        progress: base + span * 0.2,
        message:
          job.mode === 'photo-cutout'
            ? 'Removing the background…'
            : 'Rendering your vehicle…',
        ...frame,
      });

      const prompt =
        job.mode === 'photo-cutout'
          ? cutoutPrompt(descriptor, angle)
          : job.mode === 'photo-restyle'
            ? restylePrompt(descriptor, angle)
            : renderPrompt(descriptor, angle);

      const image = await generateImage({
        apiKey: job.apiKey,
        model: job.model,
        prompt,
        imageBase64: photoBase64,
        imageMimeType: 'image/jpeg',
        aspectRatio: '16:9',
        imageSize: '2K',
        signal: job.signal,
      });
      throwIfAborted(job.signal);

      report({
        stage: 'keying',
        progress: base + span * 0.65,
        message: 'Cutting it out to transparency…',
        ...frame,
      });
      const cut = await removeBackground(image.base64, { maxSize: 1280 });
      if (!cut.keyed) keyedAll = false;
      if (cut.keyed && cut.subjectRatio < 0.01) {
        throw new GeminiError('The result came back almost empty after keying.');
      }
      throwIfAborted(job.signal);

      report({ stage: 'saving', progress: base + span * 0.9, message: 'Saving artwork…', ...frame });
      const assetUri = saveBase64Png(job.vehicle.id, `vehicle-${angle}`, cut.base64);
      results.push({ angle, sourceUri, assetUri });
    } catch (err) {
      if (isAbort(err)) throw err;
      failed.push(angle);
      results.push({ angle, sourceUri, error: describeArtworkError(err) });
    }
  }

  const done = results.filter((p) => p.assetUri);
  if (done.length === 0) {
    report({ stage: 'failed', progress: 1, message: 'No angle could be processed.' });
    throw new GeminiError(
      results[0]?.error ?? 'None of the photos could be processed. Check the API key and try again.',
    );
  }

  report({ stage: 'done', progress: 1, message: 'Artwork ready.' });

  return {
    photos: results,
    heroUri: heroFrom(results),
    angleUris: turntableFrom(results),
    origin: job.mode === 'render' ? 'ai-generated' : 'ai-cutout',
    keyed: keyedAll,
    failed,
  };
}

export { heroFrom, turntableFrom } from './frames';

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GeminiError('Artwork generation cancelled.');
}

function isAbort(err: unknown): boolean {
  return err instanceof GeminiError && err.message.includes('cancelled');
}

export function describeArtworkError(err: unknown): string {
  if (err instanceof GeminiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong generating the artwork.';
}
