/**
 * Prompt templates for the vehicle artwork.
 *
 * Every prompt asks for the subject on a flat chroma-key background rather than
 * trusting the model to emit real alpha — `cutout.ts` then keys that background
 * out on device, which gives clean, consistent edges across providers and models.
 */

import type { VehicleType } from '../../data/vehicles';
import type { VehicleAngle } from '../../state/types';

/** The background colour every generation is asked to use. */
export const CHROMA_KEY = '#00FF00';

export interface VehicleDescriptor {
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  bodyStyle?: string;
  /** Free text from the rider: colour, wheels, exhaust, livery, mods. */
  colorHint?: string;
}

/** Short name for an angle, used in UI and prompts alike. */
export const ANGLE_LABEL: Record<VehicleAngle, string> = {
  side: 'Side',
  frontQuarter: 'Front 3/4',
  front: 'Front',
  rearQuarter: 'Rear 3/4',
  rear: 'Rear',
};

/** How to shoot each angle — shown under the capture slots. */
export const ANGLE_GUIDE: Record<VehicleAngle, string> = {
  side: 'Straight on from the side, whole vehicle in frame. This is the shot the dash renders.',
  frontQuarter: 'About 45° from the front corner — gives the AI the nose and the flank at once.',
  front: 'Square on to the front, camera at headlight height.',
  rearQuarter: 'About 45° from the rear corner.',
  rear: 'Square on to the back, camera at tail-light height.',
};

/** Camera instructions used when the model has to invent the shot. */
const ANGLE_CAMERA: Record<VehicleAngle, string> = {
  side: 'Exact side profile, camera perpendicular to the vehicle at wheel-hub height.',
  frontQuarter:
    'Front three-quarter view, roughly 45 degrees off the centreline, camera at wheel-hub height.',
  front: 'Straight-on front view, camera on the centreline at headlight height.',
  rearQuarter:
    'Rear three-quarter view, roughly 45 degrees off the centreline, camera at wheel-hub height.',
  rear: 'Straight-on rear view, camera on the centreline at tail-light height.',
};

/** Frames used for the 3D turntable intro, ordered front → side. */
export const TURNTABLE_ORDER: VehicleAngle[] = ['front', 'frontQuarter', 'side'];

/**
 * The angles onboarding asks for. `side` is required — it is what the dash
 * renders; the rest are encouraged.
 *
 * Bikes and cars ask for the same four: enough to cover a customised vehicle
 * and drive the turntable, few enough that shooting them is not a chore.
 */
export function captureAngles(_type: VehicleType): VehicleAngle[] {
  return ['side', 'frontQuarter', 'front', 'rear'];
}

export const REQUIRED_ANGLES: VehicleAngle[] = ['side'];

function noun(type: VehicleType): string {
  return type === 'car' ? 'car' : 'motorcycle';
}

function describe(vehicle: VehicleDescriptor): string {
  const parts = [`${vehicle.year} ${vehicle.make} ${vehicle.model}`];
  if (vehicle.bodyStyle) parts.push(`(${vehicle.bodyStyle})`);
  return parts.join(' ');
}

const sharedRules = (type: VehicleType) =>
  [
    `the background must be one flat, uniform ${CHROMA_KEY} chroma-green field with absolutely nothing else in it`,
    'no ground shadow, no reflection, no gradient, no vignette, no floor line',
    type === 'car'
      ? 'chroma green must also show through the windows, the wheel arches and under the car'
      : 'chroma green must also show through the wheels, under the bike and through every gap in the frame',
    `the entire ${noun(type)} is in frame with a small even margin, nothing cropped`,
    'sharp, clean, well-defined edges against the background',
    'no text, no watermark, no logo overlay, no people, no props',
  ].join('; ');

/**
 * Photo → cut-out. The rider's own vehicle, mods and all, with only the
 * background replaced. This is the path onboarding uses.
 */
export function cutoutPrompt(vehicle: VehicleDescriptor, angle: VehicleAngle): string {
  return [
    `Keep the ${noun(vehicle.type)} in this photo exactly as it is — same vehicle, same colour, same wheels, same modifications, same accessories, same angle, same lighting.`,
    'Do not restyle it, do not swap parts, do not clean it up, do not change the camera angle.',
    `Replace absolutely everything else with one flat, uniform ${CHROMA_KEY} chroma-green background.`,
    'Remove the ground, people, other vehicles, buildings and every background object.',
    vehicle.type === 'car'
      ? 'Chroma green must show through the windows, the wheel arches and under the car.'
      : 'Chroma green must show through the wheel spokes, under the bike and through every gap in the frame and bodywork.',
    `Keep the whole ${noun(vehicle.type)} in frame with a small even margin, sharp clean edges, no added text or watermark.`,
    `Reference: this is a ${describe(vehicle)}, photographed from the ${ANGLE_LABEL[angle].toLowerCase()}.`,
  ].join(' ');
}

/**
 * Photo → clean studio render of the same vehicle. Used when the rider wants
 * showroom artwork but still wants their own colour and mods.
 */
export function restylePrompt(vehicle: VehicleDescriptor, angle: VehicleAngle): string {
  return [
    `Using the ${noun(vehicle.type)} in these photos as the reference, produce a clean studio render of it as a ${describe(vehicle)}.`,
    ANGLE_CAMERA[angle],
    `Preserve the exact colour scheme, wheels, bodywork and modifications visible in the photos${vehicle.colorHint ? ` (${vehicle.colorHint})` : ''}.`,
    `Requirements: ${sharedRules(vehicle.type)}.`,
  ].join(' ');
}

/** No photo at all: a catalogue-accurate render from the make/model/year. */
export function renderPrompt(vehicle: VehicleDescriptor, angle: VehicleAngle): string {
  const colour = vehicle.colorHint
    ? `finished in ${vehicle.colorHint}`
    : 'in its factory colour scheme';
  return [
    `Photorealistic studio product render of a ${describe(vehicle)} ${noun(vehicle.type)}, ${colour}.`,
    ANGLE_CAMERA[angle],
    vehicle.type === 'car'
      ? 'Even, neutral studio lighting with soft highlights along the flanks; the car sits level on its wheels, steering straight.'
      : 'Even, neutral studio lighting with soft highlights along the tank and fairing; the bike stands upright on its wheels, steering straight, wheels level.',
    `Requirements: ${sharedRules(vehicle.type)}.`,
  ].join(' ');
}
