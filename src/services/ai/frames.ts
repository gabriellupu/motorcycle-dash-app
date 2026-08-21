/**
 * Which cut-out the dash shows, and in what order the intro rotates them.
 *
 * Pure selection logic over a vehicle's captured angles — no file system, no
 * network — so it stays easy to reason about and to test.
 */

import type { VehiclePhoto } from '../../state/types';

import { TURNTABLE_ORDER } from './prompts';

/** The dash renders the side view when there is one, else anything usable. */
export function heroFrom(photos: VehiclePhoto[]): string | undefined {
  return (
    photos.find((p) => p.angle === 'side' && p.assetUri)?.assetUri ??
    photos.find((p) => p.assetUri)?.assetUri
  );
}

/**
 * Turntable frames in intro order (front → side), skipping angles that were
 * never shot or failed to process. Falls back to the hero alone, so the
 * entrance always has something to rotate.
 */
export function turntableFrom(photos: VehiclePhoto[]): string[] {
  const uris = TURNTABLE_ORDER.map(
    (angle) => photos.find((p) => p.angle === angle && p.assetUri)?.assetUri,
  ).filter((uri): uri is string => !!uri);
  if (uris.length) return uris;
  const hero = heroFrom(photos);
  return hero ? [hero] : [];
}
