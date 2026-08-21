/**
 * Where bike artwork lives on disk, and how it gets there.
 *
 * Files are kept in `<documents>/bike-assets/<bikeId>/` so a profile owns its
 * renders and deleting a bike from the garage can take its artwork with it.
 */

import { Directory, File, Paths } from 'expo-file-system';

const ROOT = 'bike-assets';

function bikeDir(bikeId: string): Directory {
  const dir = new Directory(Paths.document, ROOT, bikeId);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Writes a base64 PNG and returns its file:// URI. */
export function saveBase64Png(bikeId: string, name: string, base64: string): string {
  const dir = bikeDir(bikeId);
  const file = new File(dir, `${name}.png`);
  file.create({ overwrite: true, intermediates: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Copies an arbitrary local image (camera roll, camera) into the bike folder. */
export async function copyIntoBike(
  bikeId: string,
  name: string,
  sourceUri: string,
): Promise<string> {
  const dir = bikeDir(bikeId);
  const extension = sourceUri.split('?')[0].split('.').pop()?.slice(0, 4) || 'jpg';
  const target = new File(dir, `${name}.${extension}`);
  if (target.exists) target.delete();
  await new File(sourceUri).copy(target);
  return target.uri;
}

export async function readAsBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

export function deleteBikeAssets(bikeId: string): void {
  const dir = new Directory(Paths.document, ROOT, bikeId);
  if (dir.exists) dir.delete();
}

export function assetExists(uri: string | undefined | null): boolean {
  if (!uri || !uri.startsWith('file://')) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Adds a cache-buster so <Image> reloads after a regenerate. */
export function bustCache(uri: string): string {
  return `${uri}?v=${Date.now()}`;
}
