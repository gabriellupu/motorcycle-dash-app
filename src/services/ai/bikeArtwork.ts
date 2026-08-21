/**
 * The artwork pipeline used by onboarding and by Settings → Artwork.
 *
 * generate → key out the background → trim → save → hand back file:// URIs.
 * Every stage reports progress so the UI can narrate what the AI is doing, and
 * a failure at any stage falls back to the built-in vector bike rather than
 * leaving the dash without a subject.
 */

import { BikeProfile } from '../../state/types';

import { saveBase64Png } from './assetStore';
import { removeBackground } from './cutout';
import { GeminiError, generateImage } from './gemini';
import { BikeAngle, TURNTABLE_ANGLES, cutoutPrompt, generatePrompt, restylePrompt } from './prompts';

export type ArtworkStage =
  | 'idle'
  | 'prompting'
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
  /** Which frame of a turntable job is in flight. */
  frame?: number;
  frameCount?: number;
}

export interface ArtworkJob {
  bike: Pick<BikeProfile, 'id' | 'make' | 'model' | 'year'>;
  apiKey: string;
  model: string;
  /** Source photo (file:// or base64) when restyling / cutting out a real bike. */
  photoBase64?: string;
  photoMimeType?: string;
  /** 'photo' keeps the user's bike, 'render' asks for a clean studio render. */
  mode: 'render' | 'photo-cutout' | 'photo-restyle';
  angles?: BikeAngle[];
  colorHint?: string;
  onProgress?: (progress: ArtworkProgress) => void;
  signal?: AbortSignal;
}

export interface ArtworkResult {
  heroUri: string;
  angleUris: string[];
  origin: NonNullable<BikeProfile['assetOrigin']>;
  /** Set when keying was skipped (no Skia) so the UI can warn about edges. */
  keyed: boolean;
}

export async function createBikeArtwork(job: ArtworkJob): Promise<ArtworkResult> {
  const angles: BikeAngle[] =
    job.mode === 'photo-cutout' ? ['left'] : (job.angles?.length ? job.angles : ['left']);
  const report = (p: ArtworkProgress) => job.onProgress?.(p);
  const uris: string[] = [];
  let keyedAll = true;

  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    const base = i / angles.length;
    const span = 1 / angles.length;

    report({
      stage: 'prompting',
      progress: base,
      message: angles.length > 1 ? `Framing shot ${i + 1} of ${angles.length}…` : 'Writing the brief…',
      frame: i + 1,
      frameCount: angles.length,
    });

    const prompt =
      job.mode === 'photo-cutout'
        ? cutoutPrompt()
        : job.mode === 'photo-restyle'
          ? restylePrompt({ ...job.bike, colorHint: job.colorHint }, angle)
          : generatePrompt({ ...job.bike, colorHint: job.colorHint }, angle);

    report({
      stage: 'rendering',
      progress: base + span * 0.15,
      message: 'Rendering your bike…',
      frame: i + 1,
      frameCount: angles.length,
    });

    const image = await generateImage({
      apiKey: job.apiKey,
      model: job.model,
      prompt,
      imageBase64: job.mode === 'render' ? undefined : job.photoBase64,
      imageMimeType: job.photoMimeType,
      aspectRatio: '16:9',
      imageSize: '2K',
      signal: job.signal,
    });
    throwIfAborted(job.signal);

    report({
      stage: 'keying',
      progress: base + span * 0.6,
      message: 'Cutting it out of the background…',
      frame: i + 1,
      frameCount: angles.length,
    });

    const cut = await removeBackground(image.base64, { maxSize: 1280 });
    if (!cut.keyed) keyedAll = false;
    if (cut.keyed && cut.subjectRatio < 0.01) {
      throw new GeminiError(
        'The render came back almost empty after cutting out the background. Try again or switch model.',
      );
    }
    throwIfAborted(job.signal);

    report({
      stage: 'saving',
      progress: base + span * 0.9,
      message: 'Saving artwork…',
      frame: i + 1,
      frameCount: angles.length,
    });
    uris.push(saveBase64Png(job.bike.id, `bike-${angle}`, cut.base64));
  }

  report({ stage: 'done', progress: 1, message: 'Artwork ready.' });

  return {
    heroUri: uris[0],
    angleUris: uris,
    origin: job.mode === 'photo-cutout' ? 'ai-cutout' : 'ai-generated',
    keyed: keyedAll,
  };
}

/** Convenience wrapper for the "3 angles for the turntable intro" option. */
export function turntableAngles(enabled: boolean): BikeAngle[] {
  return enabled ? TURNTABLE_ANGLES : ['left'];
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GeminiError('Artwork generation cancelled.');
}

export function describeArtworkError(err: unknown): string {
  if (err instanceof GeminiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong generating the artwork.';
}
