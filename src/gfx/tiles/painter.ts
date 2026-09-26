/**
 * Small drawing toolkit shared by all tile painters: integer-only primitives,
 * deterministic hashing / value noise and ordered dithering.
 */
import { seededRandom } from '../pixelart';

/** Thin wrapper around a 2D context that only ever fills whole pixels. */
export class Painter {
  private currentFill = '';
  /** Deterministic random stream (seeded per cached tile variant). */
  readonly rnd: () => number;

  constructor(readonly ctx: CanvasRenderingContext2D, seed: number) {
    this.rnd = seededRandom(seed);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    if (w <= 0 || h <= 0) return;
    if (color !== this.currentFill) {
      this.ctx.fillStyle = color;
      this.currentFill = color;
    }
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  px(x: number, y: number, color: string): void {
    this.rect(x, y, 1, 1, color);
  }

  hline(x: number, y: number, w: number, color: string): void {
    this.rect(x, y, w, 1, color);
  }

  vline(x: number, y: number, h: number, color: string): void {
    this.rect(x, y, 1, h, color);
  }

  /** Fills every other pixel of a rectangle (checkerboard). `parity` picks which half. */
  checker(x: number, y: number, w: number, h: number, color: string, parity = 0): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (((xx + yy) & 1) === parity) this.px(xx, yy, color);
      }
    }
  }

  /**
   * Visits every pixel whose centre lies inside the ellipse centred at (cx, cy).
   * `shade` receives the pixel plus its normalised offset (-1..1) and returns a
   * colour, or null to leave the pixel untouched.
   */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    shade: (x: number, y: number, nx: number, ny: number) => string | null,
  ): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const c = shade(x, y, nx, ny);
        if (c) this.px(x, y, c);
      }
    }
  }

  /** Draws a pre-built sprite (e.g. from spriteFromRows). */
  stamp(img: CanvasImageSource, x: number, y: number): void {
    this.ctx.drawImage(img, Math.floor(x), Math.floor(y));
  }

  /** Random integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.rnd() * n);
  }

  chance(p: number): boolean {
    return this.rnd() < p;
  }
}

// --- hashing & noise ----------------------------------------------------------

/** Integer hash of a 2D coordinate (fast, well mixed, unsigned 32-bit result). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822519);
  return (h ^ (h >>> 15)) >>> 0;
}

/** hash2 mapped to [0, 1). */
export function hash01(x: number, y: number, seed = 0): number {
  return hash2(x, y, seed) / 4294967296;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * Smooth value noise in [0, 1) with lattice spacing `cell` pixels that wraps
 * every `period` pixels, so textures stay seamless across tile borders.
 */
export function periodicNoise(x: number, y: number, cell: number, period: number, seed: number): number {
  const n = period / cell;
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smoothstep(gx - x0);
  const fy = smoothstep(gy - y0);
  const v = (i: number, j: number) => hash01(mod(i, n), mod(j, n), seed);
  const top = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx;
  const bottom = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx;
  return top + (bottom - top) * fy;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 4x4 ordered-dither threshold in (0, 1). */
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/**
 * Picks an entry from `ramp` for a value in [0, 1] using ordered dithering, so
 * gradients become the classic 16-bit checker transitions. `spread` controls
 * how wide the dithered band between two shades is.
 */
export function ditherPick<T>(ramp: readonly T[], value: number, x: number, y: number, spread = 0.5): T {
  const t = value * ramp.length + (bayer(x, y) - 0.5) * spread * 2;
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t)))];
}

/**
 * Adds a stepped radial glow (three quantised rings, crisp pixel edges) using
 * alpha blending. Good for lamps, torches and magic.
 */
export function glow(p: Painter, cx: number, cy: number, r: number, color: string, alpha: number): void {
  const { ctx } = p;
  ctx.save();
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d >= 1) continue;
      ctx.globalAlpha = alpha * (d < 0.4 ? 1 : d < 0.7 ? 0.6 : 0.3);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

export interface VoronoiSample {
  /** Distance to the nearest and second-nearest feature point (small gap = cell border). */
  d1: number;
  d2: number;
  /** Offset of the sample from its cell's feature point (for per-cell lighting). */
  dx: number;
  dy: number;
  /** Stable hash of the owning cell. */
  cell: number;
}

/**
 * Jittered-grid Voronoi (cellular) noise, wrapping every `cols` x `rows` cells.
 * Great for cobblestones and rock chunks: shade by (dx, dy), crack where d2 - d1 is small.
 */
export function voronoi(x: number, y: number, cellW: number, cellH: number, cols: number, rows: number, seed: number): VoronoiSample {
  const ci = Math.floor(x / cellW);
  const cj = Math.floor(y / cellH);
  const out: VoronoiSample = { d1: Infinity, d2: Infinity, dx: 0, dy: 0, cell: 0 };
  for (let j = cj - 1; j <= cj + 1; j++) {
    for (let i = ci - 1; i <= ci + 1; i++) {
      const cell = hash2(mod(i, cols), mod(j, rows), seed);
      const fx = (i + 0.2 + ((cell & 255) / 255) * 0.6) * cellW;
      const fy = (j + 0.2 + (((cell >> 8) & 255) / 255) * 0.6) * cellH;
      const d = Math.hypot(x - fx, y - fy);
      if (d < out.d1) {
        out.d2 = out.d1;
        out.d1 = d;
        out.dx = x - fx;
        out.dy = y - fy;
        out.cell = cell;
      } else if (d < out.d2) out.d2 = d;
    }
  }
  return out;
}
