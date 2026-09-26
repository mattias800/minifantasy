/**
 * Painter: a tiny "shaded shapes" renderer for SNES-style sprites.
 *
 * Art is built back-to-front from masks (ellipses, polygons, tapered capsules…).
 * Each `shade()` call treats its mask as a rounded relief: a distance field
 * becomes a height map, which is lit from the top-left and quantised into the
 * part's colour ramp with light ordered dithering. Pixels store (ramp, level)
 * rather than raw colours, so later passes can darken/lighten by whole ramp
 * steps (creases between parts, cast shadows, decals that follow the lighting).
 */
import { bayer, hexToRgb, type Ramp } from './color';
import { valueNoise } from './noise';
import { capsuleMask, ellipseMask, Mask, pathMask, polygonMask, smoothPath, type Point } from './mask';

/** Light direction (x right, y down, z towards the viewer): top-left, slightly frontal. */
const LIGHT = normalize(-0.55, -0.7, 0.9);

export interface ShadeOptions {
  /** Radius in px of the rounded edge profile. Small values give flat plates with bevelled rims. Default: fully domed. */
  round?: number;
  /** Brightness shift (roughly -0.5..0.5). */
  bias?: number;
  /** Strength of the lighting relief (default 0.9). */
  contrast?: number;
  /** Ordered-dither strength between bands, 0 = hard bands, 1 = full dither (default 0.5). */
  dither?: number;
  /** Darkening towards the bottom of the part, 0..1 (default 0.2). */
  falloff?: number;
  /** Specular hot-spot strength (default 0). */
  gloss?: number;
  /** Clumpy value-noise texture amount (default 0) and clump size in px (default 2). */
  noise?: number;
  noiseScale?: number;
  noiseSeed?: number;
  /** Levels to darken this part's rim where it overlaps earlier parts (default 1). */
  crease?: number;
  /** Levels to darken earlier parts just below/right of this one (default 1). */
  shadow?: number;
}

export interface DecalOptions {
  /** Brightness shift relative to the lighting of the pixels underneath. */
  bias?: number;
  dither?: number;
}

type Node = readonly [number, number, number];

export class Painter {
  private readonly ramps: Ramp[] = [];
  private readonly rampIds = new Map<Ramp, number>();
  private readonly rawIds = new Map<string, number>();
  private readonly rampOf: Int16Array;
  private readonly level: Int8Array;
  /** Last lighting value (0..1) per pixel, reused by decals. */
  private readonly light: Float32Array;
  private readonly part: Int16Array;
  private nextPart = 1;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.rampOf = new Int16Array(w * h).fill(-1);
    this.level = new Int8Array(w * h);
    this.light = new Float32Array(w * h).fill(0.6);
    this.part = new Int16Array(w * h);
  }

  // ---------------------------------------------------------------- shapes

  ellipse(cx: number, cy: number, rx: number, ry: number): Mask {
    return ellipseMask(this.w, this.h, cx, cy, rx, ry);
  }

  circle(cx: number, cy: number, r: number): Mask {
    return ellipseMask(this.w, this.h, cx, cy, r, r);
  }

  poly(pts: readonly Point[]): Mask {
    return polygonMask(this.w, this.h, pts);
  }

  capsule(x0: number, y0: number, x1: number, y1: number, r0: number, r1 = r0): Mask {
    return capsuleMask(this.w, this.h, x0, y0, x1, y1, r0, r1);
  }

  /** Chain of tapered capsules through [x, y, r] nodes; `smooth` > 0 first runs a spline through them. */
  path(nodes: readonly Node[], smooth = 0): Mask {
    return pathMask(this.w, this.h, smooth > 0 ? smoothPath(nodes, smooth) : nodes);
  }

  rect(x: number, y: number, w: number, h: number): Mask {
    return Mask.from(this.w, this.h, (px, py) => px >= x && px < x + w && py >= y && py < y + h);
  }

  mask(inside: (x: number, y: number) => boolean): Mask {
    return Mask.from(this.w, this.h, inside);
  }

  /** Everything painted so far. */
  silhouette(): Mask {
    const m = new Mask(this.w, this.h);
    for (let i = 0; i < m.data.length; i++) if (this.rampOf[i] >= 0) m.data[i] = 1;
    return m;
  }

  // -------------------------------------------------------------- painting

  /** Paints `mask` as a lit, rounded surface using `ramp`. */
  shade(mask: Mask, ramp: Ramp, o: ShadeOptions = {}): void {
    const { w, h } = this;
    const b = mask.bounds();
    if (!b) return;
    const {
      bias = 0, contrast = 0.9, dither = 0.5, falloff = 0.2, gloss = 0,
      noise = 0, noiseScale = 2, noiseSeed = 1, crease = 1, shadow = 1,
    } = o;

    const height = reliefHeight(mask, o.round);
    const H = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : height[y * w + x]);
    const tex = noise > 0 ? valueNoise(noiseSeed, noiseScale) : null;
    const rampId = this.rampId(ramp);
    const id = this.nextPart++;
    const spanY = Math.max(1, b.y1 - b.y0);

    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        const i = y * w + x;
        if (!mask.data[i]) continue;
        const [nx, ny, nz] = normalize(-(H(x + 1, y) - H(x - 1, y)) * 0.75, -(H(x, y + 1) - H(x, y - 1)) * 0.75, 1);
        const dot = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        let v = 0.6 + (dot - LIGHT[2]) * contrast + bias;
        v -= falloff * ((y - b.y0) / spanY - 0.4);
        if (gloss > 0) v += gloss * Math.max(0, dot) ** 24;
        if (tex) v += tex(x, y) * noise;
        this.light[i] = v;
        this.put(i, rampId, quantize(v, ramp.length, x, y, dither), id);
      }
    }

    if (crease > 0) {
      // Rim line where this part sits on top of earlier parts.
      this.forEach(mask, b, (x, y, i) => {
        if (this.part[i] !== id) return;
        const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const j = (y + dy) * w + (x + dx);
          return !mask.has(x + dx, y + dy) && this.inside(x + dx, y + dy) && this.rampOf[j] >= 0;
        });
        if (touches) this.level[i] = Math.max(0, this.level[i] - crease);
      });
    }

    if (shadow > 0) {
      // Short drop shadow (down-right, away from the light) onto whatever lies underneath.
      const cast = mask.shift(1, 1).union(mask.shift(0, 2), mask.shift(1, 2)).subtract(mask);
      this.adjust(cast, -shadow);
    }
  }

  /** Paints `mask` with a single colour, or a fixed level of a ramp. */
  flat(mask: Mask, color: string | Ramp, level = 0): void {
    if (typeof color === 'string') this.fill(mask, [color], () => 0);
    else this.fill(mask, color, () => level);
  }

  /** Paints `mask` with `ramp`, choosing each pixel's level with `levelAt` (faceted gems, gradients). */
  fill(mask: Mask, ramp: Ramp, levelAt: (x: number, y: number) => number): void {
    const rampId = ramp.length === 1 ? this.rawId(ramp[0]) : this.rampId(ramp);
    const id = this.nextPart++;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (!mask.data[i]) continue;
        const lv = Math.max(0, Math.min(ramp.length - 1, Math.round(levelAt(x, y))));
        this.light[i] = lv / Math.max(1, ramp.length - 1);
        this.put(i, rampId, lv, id);
      }
    }
  }

  /**
   * Recolours already-painted pixels inside `mask` with `ramp`, keeping the
   * lighting of whatever is underneath (spots, stripes, moss, markings).
   */
  decal(mask: Mask, ramp: Ramp, o: DecalOptions = {}): void {
    const { bias = 0, dither = 0.5 } = o;
    const rampId = this.rampId(ramp);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (!mask.data[i] || this.rampOf[i] < 0) continue;
        this.rampOf[i] = rampId;
        this.level[i] = quantize(this.light[i] + bias, ramp.length, x, y, dither);
      }
    }
  }

  /** Shifts painted pixels inside `mask` by `delta` ramp levels (negative = darker). */
  adjust(mask: Mask, delta: number): void {
    for (let i = 0; i < mask.data.length; i++) {
      const r = this.rampOf[i];
      if (!mask.data[i] || r < 0) continue;
      this.level[i] = Math.max(0, Math.min(this.ramps[r].length - 1, this.level[i] + delta));
    }
  }

  /** Sets a single pixel (ignored outside the canvas). */
  dot(x: number, y: number, color: string): void {
    if (!this.inside(x, y)) return;
    this.put(y * this.w + x, this.rawId(color), 0, 0);
  }

  /** Several single pixels of one colour. */
  dots(color: string, pts: readonly Point[]): void {
    for (const [x, y] of pts) this.dot(x, y, color);
  }

  /** 1px Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    let x = Math.round(x0), y = Math.round(y0);
    const tx = Math.round(x1), ty = Math.round(y1);
    const dx = Math.abs(tx - x), dy = -Math.abs(ty - y);
    const sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.dot(x, y, color);
      if (x === tx && y === ty) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  /** Polyline through points. */
  polyline(color: string, pts: readonly Point[]): void {
    for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], color);
  }

  /** Adds a 1px outline around the whole silhouette (8-neighbourhood, so diagonals close up). */
  outline(color: string): void {
    this.flat(this.silhouette().ring(), color);
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    const img = ctx.createImageData(this.w, this.h);
    const rgbCache = new Map<string, [number, number, number]>();
    for (let i = 0; i < this.rampOf.length; i++) {
      const r = this.rampOf[i];
      if (r < 0) continue;
      const hex = this.ramps[r][this.level[i]];
      let rgb = rgbCache.get(hex);
      if (!rgb) rgbCache.set(hex, (rgb = hexToRgb(hex)));
      img.data.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  // ------------------------------------------------------------- internals

  private inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  private put(i: number, rampId: number, level: number, part: number): void {
    this.rampOf[i] = rampId;
    this.level[i] = level;
    this.part[i] = part;
  }

  private forEach(mask: Mask, b: { x0: number; y0: number; x1: number; y1: number }, fn: (x: number, y: number, i: number) => void): void {
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (mask.data[y * this.w + x]) fn(x, y, y * this.w + x);
  }

  private rampId(ramp: Ramp): number {
    let id = this.rampIds.get(ramp);
    if (id === undefined) {
      id = this.ramps.push(ramp) - 1;
      this.rampIds.set(ramp, id);
    }
    return id;
  }

  private rawId(color: string): number {
    let id = this.rawIds.get(color);
    if (id === undefined) {
      id = this.ramps.push([color]) - 1;
      this.rawIds.set(color, id);
    }
    return id;
  }
}

// ------------------------------------------------------------------ helpers

function normalize(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** Ramp level for a lighting value in 0..1, with ordered dithering near band edges. */
function quantize(v: number, n: number, x: number, y: number, dither: number): number {
  const t = v * (n - 1) + (bayer(x, y) - 0.5) * dither;
  return Math.max(0, Math.min(n - 1, Math.round(t)));
}

/**
 * Height map for a mask: chamfer distance to the outside, pushed through a
 * circular profile of radius `round` (default: the mask's max depth, i.e. a
 * full dome), then softened with a 3x3 box blur to hide medial-axis creases.
 */
function reliefHeight(mask: Mask, round?: number): Float32Array {
  const { w, h } = mask;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask.data[i] ? 1e6 : 0;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  const S = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] > 0) d[i] = Math.min(d[i], get(x - 1, y) + 1, get(x, y - 1) + 1, get(x - 1, y - 1) + S, get(x + 1, y - 1) + S);
    }
  }
  let maxD = 0;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] > 0) d[i] = Math.min(d[i], get(x + 1, y) + 1, get(x, y + 1) + 1, get(x + 1, y + 1) + S, get(x - 1, y + 1) + S);
      if (d[i] > maxD) maxD = d[i];
    }
  }
  const R = Math.max(1, round ?? maxD);
  const prof = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) {
    if (!d[i]) continue;
    const t = 1 - Math.min(d[i], R) / R;
    prof[i] = R * Math.sqrt(1 - t * t);
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask.data[y * w + x]) continue;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) sum += prof[yy * w + xx];
        }
      }
      out[y * w + x] = sum / 9;
    }
  }
  return out;
}
