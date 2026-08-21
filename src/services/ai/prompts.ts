/**
 * Prompt templates for the bike artwork.
 *
 * Every prompt asks for the subject on a flat chroma-key background rather than
 * trusting the model to emit real alpha — `cutout.ts` then keys that background
 * out locally, which gives clean, consistent edges across providers and models.
 */

/** The background colour every generation is asked to use. */
export const CHROMA_KEY = '#00FF00';

export interface BikeDescriptor {
  make: string;
  model: string;
  year: number;
  colorHint?: string;
}

const SHARED_RULES = [
  `the background must be one flat, uniform ${CHROMA_KEY} chroma-green field with absolutely nothing else in it`,
  'no ground shadow, no reflection, no gradient, no vignette, no floor line',
  'chroma green must also show through the wheels, under the bike and through every gap in the frame',
  'the entire motorcycle is in frame with a small even margin, nothing cropped',
  'sharp, clean, well-defined edges against the background',
  'no text, no watermark, no logo overlay, no people, no props',
].join('; ');

export function generatePrompt(bike: BikeDescriptor, angle: BikeAngle): string {
  const color = bike.colorHint ? `finished in ${bike.colorHint}` : 'in its factory colour scheme';
  return [
    `Photorealistic studio product render of a ${bike.year} ${bike.make} ${bike.model} motorcycle, ${color}.`,
    `${ANGLE_DESCRIPTIONS[angle]}`,
    'Even, neutral studio lighting with soft highlights along the tank and fairing; the bike stands upright on its wheels, steering straight, wheels level.',
    `Requirements: ${SHARED_RULES}.`,
  ].join(' ');
}

export function cutoutPrompt(): string {
  return [
    'Keep the motorcycle in this photo exactly as it is — same bike, same colours, same paint, same parts, same angle, same lighting.',
    `Replace absolutely everything else with one flat, uniform ${CHROMA_KEY} chroma-green background.`,
    'Remove the ground, the rider, bystanders, buildings, kickstand shadows and every background object.',
    'Chroma green must show through the wheel spokes, under the bike and through every gap in the frame and bodywork.',
    'Keep the full bike in frame with a small even margin, sharp clean edges, no added text or watermark.',
  ].join(' ');
}

export function restylePrompt(bike: BikeDescriptor, angle: BikeAngle): string {
  return [
    `Using the motorcycle in this photo as the reference, produce a clean studio render of it as a ${bike.year} ${bike.make} ${bike.model}.`,
    ANGLE_DESCRIPTIONS[angle],
    'Preserve the bike’s colour scheme, bodywork and accessories from the photo.',
    `Requirements: ${SHARED_RULES}.`,
  ].join(' ');
}

export type BikeAngle = 'left' | 'threeQuarterLeft' | 'front' | 'threeQuarterRight' | 'right';

const ANGLE_DESCRIPTIONS: Record<BikeAngle, string> = {
  left: 'Exact left-side profile view, camera perpendicular to the bike at wheel-hub height.',
  threeQuarterLeft:
    'Front three-quarter view from the left, roughly 45 degrees off the bike’s centreline, camera at wheel-hub height.',
  front: 'Straight-on front view, camera on the bike’s centreline at headlight height.',
  threeQuarterRight:
    'Front three-quarter view from the right, roughly 45 degrees off the bike’s centreline, camera at wheel-hub height.',
  right: 'Exact right-side profile view, camera perpendicular to the bike at wheel-hub height.',
};

/** Frames used for the 3D turntable intro, ordered left -> front. */
export const TURNTABLE_ANGLES: BikeAngle[] = ['left', 'threeQuarterLeft', 'front'];
