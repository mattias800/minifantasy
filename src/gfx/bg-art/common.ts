/**
 * Shared building blocks for the 256x224 battle backdrops: dithered gradient
 * bands, ridge-line silhouettes, perspective ground and additive glows.
 */
import { bayer, hexToRgb, type Ramp } from '../paint/color';
import type { Mask } from '../paint/mask';
import type { Painter } from '../paint/painter';

export const BG_W = 256;
export const BG_H = 224;

/**
 * Fills rows y0..y1 of `area` (default: full width) with `ramp` running from
 * first to last colour top-to-bottom: solid bands with short ordered-dither
 * transitions between them, the classic SNES sky look.
 */
export function gradientBands(p: Painter, y0: number, y1: number, ramp: Ramp, area?: Mask): void {
  const region = area ?? p.rect(0, y0, BG_W, y1 - y0);
  const span = Math.max(1, y1 - y0);
  p.fill(region, ramp, (x, y) => {
    const v = (Math.max(0, Math.min(span, y - y0)) / span) * (ramp.length - 1);
    const base = Math.floor(v);
    // Only the last ~40% of each band dithers into the next colour.
    const f = Math.max(0, Math.min(1, (v - base - 0.6) / 0.4));
    return base + (f > bayer(x, y) ? 1 : 0);
  });
}

/** Pixels from the ridge line `top(x)` down to `bottom` (exclusive). */
export function ridge(p: Painter, top: (x: number) => number, bottom = BG_H): Mask {
  return p.mask((x, y) => y >= top(x) && y < bottom);
}

/** Sum of sines — a cheap, deterministic 1D terrain profile. */
export function waves(x: number, terms: readonly (readonly [amp: number, period: number, phase: number])[]): number {
  let v = 0;
  for (const [a, per, ph] of terms) v += a * Math.sin((x / per) * Math.PI * 2 + ph);
  return v;
}

/**
 * Perspective ground from `horizon` to the bottom: rows squeeze together near
 * the horizon. Returns a depth value per row (0 at horizon .. 1 at the bottom)
 * and a stripe index that changes at perspective-correct intervals.
 */
export function groundDepth(y: number, horizon: number): { depth: number; stripe: number } {
  const d = Math.max(0, y - horizon);
  const depth = d / (BG_H - horizon);
  return { depth, stripe: Math.floor(Math.sqrt(d) * 1.6) };
}

/**
 * Additive halo (SNES-style colour math) around (cx, cy), quantised into a few
 * dithered steps so it stays crisp when upscaled.
 */
export function glow(canvas: HTMLCanvasElement, cx: number, cy: number, rx: number, ry: number, color: string, strength = 0.35): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const [r, g, b] = hexToRgb(color);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      if (d >= 1) continue;
      const steps = 3;
      const level = Math.floor((1 - d) ** 1.5 * steps + bayer(x, y) * 0.999);
      if (level <= 0) continue;
      ctx.fillStyle = `rgba(${r},${g},${b},${((level / steps) * strength).toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

/** Additive wash over `mask` (light shafts, mist), ordered-dithered between two intensities. */
export function lightWash(canvas: HTMLCanvasElement, mask: Mask, color: string, strength = 0.2): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const [r, g, b] = hexToRgb(color);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (!mask.has(x, y)) continue;
      const a = bayer(x, y) < 0.5 ? strength : strength * 0.5;
      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}
