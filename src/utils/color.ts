/** Tiny colour helpers — no dependency, works with #rgb, #rrggbb and rgba(). */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string): RGBA {
  const value = input.trim();
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b].some(Number.isNaN)) return { r: 0, g: 0, b: 0, a: 1 };
    return { r, g, b, a };
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] ?? 1 };
  }
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  return { r: 255, g: 255, b: 255, a: 1 };
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function rgba(color: string, alpha: number): string {
  const { r, g, b } = parseColor(color);
  return `rgba(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgba(${clamp255(ca.r + (cb.r - ca.r) * k)}, ${clamp255(ca.g + (cb.g - ca.g) * k)}, ${clamp255(
    ca.b + (cb.b - ca.b) * k,
  )}, ${(ca.a + (cb.a - ca.a) * k).toFixed(3)})`;
}

export function lighten(color: string, amount: number): string {
  return mix(color, '#FFFFFF', amount);
}

export function darken(color: string, amount: number): string {
  return mix(color, '#000000', amount);
}

/** Perceived luminance 0..1 (sRGB weights). */
export function luminance(color: string): number {
  const { r, g, b } = parseColor(color);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function readableOn(background: string, light = '#FFFFFF', dark = '#0B1220'): string {
  return luminance(background) > 0.55 ? dark : light;
}

export function toHex(color: string): string {
  const { r, g, b } = parseColor(color);
  return `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** HSL -> hex, used by the accent picker. */
export function hsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return `#${[r1 + m, g1 + m, b1 + m]
    .map((v) => clamp255(v * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}
