/**
 * Colour utilities for procedural pixel art: hex parsing, mixing, hue-shifted
 * shading ramps and ordered (Bayer) dithering.
 */

/** A shading ramp: CSS hex colours ordered from darkest to lightest. */
export type Ramp = readonly string[];

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear blend between two hex colours (t=0 -> a, t=1 -> b). */
export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
}

export interface RampOptions {
  /** How far the darkest shade moves towards `shadow` (0..1). Default 0.78. */
  dark?: number;
  /** How far the lightest shade moves towards `highlight` (0..1). Default 0.6. */
  light?: number;
  /** Colour shadows drift towards (cool by default, the classic hue-shift). */
  shadow?: string;
  /** Colour highlights drift towards (warm by default). */
  highlight?: string;
}

/**
 * Builds a hue-shifted ramp around `base`: shadows lean cool/purple, highlights
 * lean warm, which reads far richer than plain darkening/lightening.
 * `base` sits slightly above the middle of the ramp.
 */
export function makeRamp(base: string, steps = 6, opts: RampOptions = {}): Ramp {
  const { dark = 0.78, light = 0.6, shadow = '#140a26', highlight = '#fff8e0' } = opts;
  const baseIdx = Math.round((steps - 1) * 0.55);
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    if (i < baseIdx) out.push(mix(base, shadow, ((baseIdx - i) / baseIdx) * dark));
    else if (i > baseIdx) out.push(mix(base, highlight, ((i - baseIdx) / (steps - 1 - baseIdx)) * light));
    else out.push(base);
  }
  return out;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 4x4 ordered-dither threshold in (0, 1). */
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}
