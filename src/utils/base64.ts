/**
 * Minimal base64 codec. react-native-ble-plx exchanges characteristic payloads
 * as base64 strings and Hermes ships no atob/btoa, so we do it ourselves rather
 * than pulling in a polyfill.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(input: string): string {
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const c1 = input.charCodeAt(i) & 0xff;
    const c2 = i + 1 < input.length ? input.charCodeAt(i + 1) & 0xff : NaN;
    const c3 = i + 2 < input.length ? input.charCodeAt(i + 2) & 0xff : NaN;

    output += ALPHABET[c1 >> 2];
    output += ALPHABET[((c1 & 0x03) << 4) | (Number.isNaN(c2) ? 0 : c2 >> 4)];
    output += Number.isNaN(c2)
      ? '='
      : ALPHABET[((c2 & 0x0f) << 2) | (Number.isNaN(c3) ? 0 : c3 >> 6)];
    output += Number.isNaN(c3) ? '=' : ALPHABET[c3 & 0x3f];
  }
  return output;
}

export function decodeBase64(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  let output = '';
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = ALPHABET.indexOf(clean[i]);
    const e2 = ALPHABET.indexOf(clean[i + 1]);
    const e3 = ALPHABET.indexOf(clean[i + 2]);
    const e4 = ALPHABET.indexOf(clean[i + 3]);

    output += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (e3 >= 0) output += String.fromCharCode(((e2 & 0x0f) << 4) | (e3 >> 2));
    if (e4 >= 0) output += String.fromCharCode(((e3 & 0x03) << 6) | e4);
  }
  return output;
}
