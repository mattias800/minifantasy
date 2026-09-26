/**
 * Low-level helpers for building crisp pixel-art canvases.
 *
 * All game art is generated at runtime from code (string grids or procedural
 * drawing) so the project ships with zero third-party assets.
 */

/** Maps a single grid character to a CSS hex colour. `.` and ` ` are always transparent. */
export type Palette = Record<string, string>;

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas not supported');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/**
 * Builds a sprite from rows of characters. Every row must have the same length.
 * Unknown characters throw so typos in art are caught immediately.
 */
export function spriteFromRows(rows: readonly string[], palette: Palette): HTMLCanvasElement {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const canvas = createCanvas(width, height);
  const ctx = ctx2d(canvas);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row.length !== width) {
      throw new Error(`spriteFromRows: row ${y} has length ${row.length}, expected ${width}: "${row}"`);
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) throw new Error(`spriteFromRows: no palette entry for "${ch}"`);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function flipX(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height);
  const ctx = ctx2d(c);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Returns a copy where every exact colour in `map` (hex -> hex) is replaced. Useful for palette swaps. */
export function recolor(src: HTMLCanvasElement, map: Record<string, string>): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height);
  const ctx = ctx2d(c);
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const lookup = new Map<number, [number, number, number]>();
  for (const [from, to] of Object.entries(map)) {
    const [r, g, b] = parseHex(from);
    lookup.set((r << 16) | (g << 8) | b, parseHex(to));
  }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const to = lookup.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (to) [d[i], d[i + 1], d[i + 2]] = to;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Returns a copy with every opaque pixel painted a single colour (hit flashes, shadows). */
export function silhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height);
  const ctx = ctx2d(c);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Paints a 1px outline into transparent pixels that touch opaque ones (4-neighbourhood). Same size as input. */
export function outline(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const data = ctx2d(src).getImageData(0, 0, w, h).data;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Deterministic PRNG (mulberry32) so procedural art looks the same every run. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
