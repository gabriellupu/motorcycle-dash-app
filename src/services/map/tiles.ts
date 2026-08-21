/**
 * Slippy-map helpers.
 *
 * The dash renders its own 3x3 tile grid instead of embedding a full map SDK:
 * it keeps the preview cheap, works with any raster tile provider, needs no API
 * key, and lets us mask it with a radial fade so it melts into the dash.
 */

export interface MapStyle {
  id: string;
  name: string;
  /** Raster XYZ template with {z}/{x}/{y} placeholders. */
  url: string;
  attribution: string;
  dark: boolean;
  maxZoom: number;
}

export const MAP_STYLES: MapStyle[] = [
  {
    id: 'dark',
    name: 'Dark',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    dark: true,
    maxZoom: 20,
  },
  {
    id: 'light',
    name: 'Light',
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    dark: false,
    maxZoom: 20,
  },
  {
    id: 'voyager',
    name: 'Voyager',
    url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    dark: false,
    maxZoom: 20,
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    dark: false,
    maxZoom: 19,
  },
  {
    id: 'none',
    name: 'Vector grid (offline)',
    url: '',
    attribution: 'Offline grid',
    dark: true,
    maxZoom: 20,
  },
];

export const DEFAULT_MAP_STYLE_ID = 'dark';

export function getMapStyle(id: string | undefined): MapStyle {
  return MAP_STYLES.find((s) => s.id === id) ?? MAP_STYLES[0];
}

export const TILE_SIZE = 256;

export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom);
}

export function tileUrl(style: MapStyle, z: number, x: number, y: number): string {
  const n = Math.pow(2, z);
  const wrappedX = ((x % n) + n) % n;
  if (y < 0 || y >= n) return '';
  return style.url
    .replace('{z}', String(z))
    .replace('{x}', String(wrappedX))
    .replace('{y}', String(y));
}

/** Metres per pixel at a given latitude/zoom — used to scale the trail. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

export interface TileRef {
  key: string;
  url: string;
  /** Offset in px from the centre of the viewport. */
  dx: number;
  dy: number;
}

/**
 * Returns the tiles needed to cover a `size`-px square centred on lat/lon,
 * with their pixel offsets relative to the centre.
 */
export function tilesAround(
  style: MapStyle,
  lat: number,
  lon: number,
  zoom: number,
  size: number,
): TileRef[] {
  if (!style.url) return [];
  const z = Math.max(1, Math.min(style.maxZoom, Math.round(zoom)));
  const fx = lonToTileX(lon, z);
  const fy = latToTileY(lat, z);
  const originX = Math.floor(fx);
  const originY = Math.floor(fy);
  // Fractional position inside the centre tile, in px.
  const insideX = (fx - originX) * TILE_SIZE;
  const insideY = (fy - originY) * TILE_SIZE;
  const radius = Math.max(1, Math.ceil(size / 2 / TILE_SIZE));

  const tiles: TileRef[] = [];
  for (let ty = -radius; ty <= radius; ty++) {
    for (let tx = -radius; tx <= radius; tx++) {
      const url = tileUrl(style, z, originX + tx, originY + ty);
      if (!url) continue;
      tiles.push({
        key: `${z}/${originX + tx}/${originY + ty}`,
        url,
        dx: tx * TILE_SIZE - insideX,
        dy: ty * TILE_SIZE - insideY,
      });
    }
  }
  return tiles;
}
