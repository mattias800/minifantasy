/**
 * Binary pixel masks and shape rasterisers. Shapes are sampled at pixel
 * centres, so everything lands on the integer grid with crisp edges.
 */

export type Point = readonly [number, number];

export class Mask {
  readonly data: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
    data?: Uint8Array,
  ) {
    this.data = data ?? new Uint8Array(w * h);
  }

  /** Builds a mask by evaluating `inside` at every pixel centre. */
  static from(w: number, h: number, inside: (x: number, y: number) => boolean): Mask {
    const m = new Mask(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x + 0.5, y + 0.5)) m.data[y * w + x] = 1;
    return m;
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.data[y * this.w + x] === 1;
  }

  union(...others: Mask[]): Mask {
    const out = new Mask(this.w, this.h, this.data.slice());
    for (const o of others) for (let i = 0; i < out.data.length; i++) out.data[i] |= o.data[i];
    return out;
  }

  subtract(...others: Mask[]): Mask {
    const out = new Mask(this.w, this.h, this.data.slice());
    for (const o of others) for (let i = 0; i < out.data.length; i++) if (o.data[i]) out.data[i] = 0;
    return out;
  }

  intersect(other: Mask): Mask {
    const out = new Mask(this.w, this.h);
    for (let i = 0; i < out.data.length; i++) out.data[i] = this.data[i] & other.data[i];
    return out;
  }

  /** Copy moved by (dx, dy) whole pixels. */
  shift(dx: number, dy: number): Mask {
    return Mask.from(this.w, this.h, (x, y) => this.has(Math.floor(x) - dx, Math.floor(y) - dy));
  }

  /** Pixels of this mask that touch (4-neighbourhood) a pixel outside it. */
  edge(): Mask {
    return Mask.from(this.w, this.h, (fx, fy) => {
      const x = Math.floor(fx);
      const y = Math.floor(fy);
      return this.has(x, y) && (!this.has(x - 1, y) || !this.has(x + 1, y) || !this.has(x, y - 1) || !this.has(x, y + 1));
    });
  }

  /** Pixels just outside this mask that touch it (8-neighbourhood) — outlines. */
  ring(): Mask {
    return Mask.from(this.w, this.h, (fx, fy) => {
      const x = Math.floor(fx), y = Math.floor(fy);
      if (this.has(x, y)) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.has(x + dx, y + dy)) return true;
      return false;
    });
  }

  /** Bounding box of set pixels (inclusive), or null when empty. */
  bounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.data[y * this.w + x]) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
}

export function ellipseMask(w: number, h: number, cx: number, cy: number, rx: number, ry: number): Mask {
  return Mask.from(w, h, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
}

/** Even-odd filled polygon. */
export function polygonMask(w: number, h: number, pts: readonly Point[]): Mask {
  return Mask.from(w, h, (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

/** Tapered capsule from (x0,y0) radius r0 to (x1,y1) radius r1 — limbs, horns, tails. */
export function capsuleMask(w: number, h: number, x0: number, y0: number, x1: number, y1: number, r0: number, r1 = r0): Mask {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  return Mask.from(w, h, (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
    const px = x0 + dx * t - x;
    const py = y0 + dy * t - y;
    const r = r0 + (r1 - r0) * t;
    return px * px + py * py <= r * r;
  });
}

/** Union of tapered capsules through a list of [x, y, radius] nodes (serpent bodies, tails, tentacles). */
export function pathMask(w: number, h: number, nodes: readonly (readonly [number, number, number])[]): Mask {
  let m = new Mask(w, h);
  for (let i = 0; i + 1 < nodes.length; i++) {
    const [ax, ay, ar] = nodes[i];
    const [bx, by, br] = nodes[i + 1];
    m = m.union(capsuleMask(w, h, ax, ay, bx, by, ar, br));
  }
  return m;
}

/** Samples a Catmull-Rom spline through [x, y, r] control nodes into `perSegment` steps each. */
export function smoothPath(
  nodes: readonly (readonly [number, number, number])[],
  perSegment = 6,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  const at = (i: number) => nodes[Math.max(0, Math.min(nodes.length - 1, i))];
  for (let i = 0; i + 1 < nodes.length; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1 | 2) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1), f(2)]);
    }
  }
  const last = nodes[nodes.length - 1];
  out.push([last[0], last[1], last[2]]);
  return out;
}
