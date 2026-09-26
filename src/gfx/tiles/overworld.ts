/** World-map tiles: meadows, forests, hills, mountains, beaches, roads and location icons. */
import { spriteFromRows } from '../pixelart';
import {
  CANOPY, CAVE_ROCK, CLOTH_BLUE, DIRT, FLOWER_COLORS, GLASS, GRASS, INK, MOUNTAIN, PLASTER, ROOF, SAND, TRUNK, WOOD,
} from './palette';
import { leafBall } from './foliage';
import { Painter, ditherPick, periodicNoise } from './painter';
import {
  dirtBase, grassBase, grassFringe, isGrassy, sandBase, scatterTufts,
} from './textures';
import { E, N, S, W, has, neighbourBit, neighbourMask, type TileDef, type TileId, type TileNeighborhood, type TileState } from './types';

// --- meadow -----------------------------------------------------------------------------

export const grass: TileDef = {
  phased: true,
  variants: 6,
  paint(p, s) {
    grassBase(p, s.wx, s.wy);
    // Most cells get a tuft or two; a few are left clean.
    scatterTufts(p, [0, 1, 1, 2, 2, 3][s.variant]);
  },
};

export const flowers: TileDef = {
  phased: true,
  variants: 4,
  frames: 2,
  frameMs: 600,
  paint(p, s) {
    grassBase(p, s.wx, s.wy);
    scatterTufts(p, 1);
    const count = 4 + (s.variant % 2);
    for (let i = 0; i < count; i++) {
      const x = 2 + p.int(12);
      const y = 2 + p.int(12);
      const [petal, shade] = FLOWER_COLORS[(s.variant + i) % FLOWER_COLORS.length];
      const sway = s.frame === 1 && i % 2 === 0 ? 1 : 0;
      flower(p, x + sway, y, petal, shade);
    }
  },
};

/** Four-petal flower with a golden centre and a stem shadow. */
function flower(p: Painter, x: number, y: number, petal: string, shade: string): void {
  p.px(x, y + 2, GRASS[1]);
  p.px(x - 1, y, petal);
  p.px(x + 1, y, shade);
  p.px(x, y - 1, petal);
  p.px(x, y + 1, shade);
  p.px(x, y, '#f8e070');
}

// --- hills ---------------------------------------------------------------------------------

/** Mound layouts per variant: [centreX, baseY, radiusX, height], drawn back to front. */
const HILL_LAYOUTS: readonly (readonly [number, number, number, number])[][] = [
  [[5, 8, 5, 5], [11, 14, 5, 5]],
  [[11, 8, 5, 5], [5, 14, 5, 5]],
  [[5, 11, 4, 4], [11, 13, 5, 6]],
];

export const hills: TileDef = {
  phased: true,
  variants: HILL_LAYOUTS.length,
  paint(p, s) {
    grassBase(p, s.wx, s.wy);
    for (const [cx, base, rx, h] of HILL_LAYOUTS[s.variant]) mound(p, cx, base, rx, h);
  },
};

/**
 * A rolling grassy bump. The body keeps the meadow colour; its shape comes from a
 * bright rim on the lit (top-left) side, a dark contour on the shadow side and a
 * short shadow at its foot, the way 16-bit world maps draw hills.
 */
function mound(p: Painter, cx: number, baseY: number, rx: number, h: number): void {
  p.hline(cx - rx + 2, baseY + 1, rx * 2 - 1, GRASS[1]);
  p.ellipse(cx, baseY + 0.5, rx, h, (x, y, nx, ny) => {
    if (y > baseY) return null;
    const r = Math.hypot(nx, ny);
    const light = -(nx * 0.75 + ny * 0.65);
    if (r > 0.8) return light > 0.15 ? GRASS[5] : light < -0.1 || y === baseY ? GRASS[1] : GRASS[2];
    if (light > 0.45 && r > 0.45) return GRASS[4];
    if (light < -0.2) return ((x + y) & 1) === 0 ? GRASS[2] : GRASS[3];
    return GRASS[3];
  });
}

// --- forest ------------------------------------------------------------------------------------

const CANOPY_R = 4.4;
/** Canopy rows inside one tile: y and the x positions of the tree centres (staggered). */
const CANOPY_ROWS: readonly (readonly [number, readonly number[]])[] = [
  [2, [4, 12]],
  [6, [0, 8]],
  [10, [4, 12]],
  [14, [0, 8]],
];

interface Canopy {
  x: number;
  y: number;
  trunk: boolean;
}

/**
 * Canopies owned by the forest tile at offset (ox, oy), in our tile's coordinates.
 * Each tile decides its canopies only from its own neighbours, so overlapping
 * canopies from adjacent forest tiles are drawn identically on both sides.
 */
function canopiesOf(isForest: (dx: number, dy: number) => boolean, ox: number, oy: number): Canopy[] {
  if (!isForest(ox, oy)) return [];
  const northEdge = !isForest(ox, oy - 1);
  const southEdge = !isForest(ox, oy + 1);
  const westEdge = !isForest(ox - 1, oy);
  const out: Canopy[] = [];
  for (const [rowY, xs] of CANOPY_ROWS) {
    if (southEdge && rowY === 14) continue;
    const y = rowY === 2 && northEdge ? 4 : rowY;
    for (const x of xs) {
      if (x === 0 && westEdge) continue;
      out.push({ x: ox * 16 + x, y: oy * 16 + y, trunk: southEdge && rowY === 10 });
    }
  }
  return out;
}

export const forest: TileDef = {
  mask: (nb) => neighbourMask(nb, (id) => id === 'forest'),
  paint(p, s) {
    // Cells outside the 3x3 neighbourhood only affect canopies that never reach us.
    const forestAt = (dx: number, dy: number) => {
      const bit = neighbourBit(dx, dy);
      return bit === 0 || has(s.mask, bit);
    };
    paintForestFloor(p, s.mask);
    const canopies: Canopy[] = [];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) canopies.push(...canopiesOf(forestAt, ox, oy));
    const visible = canopies.filter((c) => c.x > -CANOPY_R - 1 && c.x < 17 + CANOPY_R && c.y > -CANOPY_R - 1 && c.y < 17 + CANOPY_R);
    visible.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const c of visible) if (c.trunk) treeTrunk(p, c.x, c.y);
    for (const c of visible) leafBall(p, c.x, c.y, CANOPY_R);
  },
};

/** Dark undergrowth inside the forest, grass along the sides that border open land. */
function paintForestFloor(p: Painter, mask: number): void {
  p.rect(0, 0, 16, 16, CANOPY[0]);
  p.checker(0, 0, 16, 16, CANOPY[1]);
  if (!has(mask, N)) p.rect(0, 0, 16, 4, GRASS[3]);
  if (!has(mask, S)) {
    p.rect(0, 12, 16, 4, GRASS[3]);
    p.hline(0, 12, 16, GRASS[2]);
  }
  if (!has(mask, W)) p.rect(0, 0, 3, 16, GRASS[3]);
  if (!has(mask, E)) p.rect(13, 0, 3, 16, GRASS[3]);
}

function treeTrunk(p: Painter, cx: number, cy: number): void {
  const x = Math.round(cx) - 1;
  const y = Math.round(cy) + 2;
  p.rect(x - 1, y + 3, 5, 1, GRASS[1]); // ground shadow
  p.rect(x, y, 2, 4, TRUNK[1]);
  p.vline(x, y, 3, TRUNK[2]);
}

// --- mountains ---------------------------------------------------------------------------------

/** Peak layouts per variant: [apexX, baseY, halfWidth, height], drawn back to front. */
const PEAK_LAYOUTS: readonly (readonly [number, number, number, number])[][] = [
  [[8, 16, 8, 14]],
  [[5, 11, 5, 10], [11, 16, 6, 12]],
  [[11, 11, 5, 10], [5, 16, 6, 12]],
];

export const mountain: TileDef = {
  phased: true,
  variants: PEAK_LAYOUTS.length,
  mask: (nb) => neighbourMask(nb, (id) => id !== 'mountain' && isGrassy(id)),
  paint(p, s) {
    paintMountainBase(p, s, s.mask);
    // Keep peaks off the tile sides that face open land so the range has a ragged outline.
    const minX = has(s.mask, W) ? 2 : 0;
    const maxX = has(s.mask, E) ? 13 : 15;
    for (const [ax, base, hw, h] of PEAK_LAYOUTS[s.variant]) peak(p, ax, base, hw, h, minX, maxX);
  },
};

/** Dark scree between the peaks, with a ragged grass border towards open land. */
function paintMountainBase(p: Painter, s: TileState, grassySides: number): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = periodicNoise(s.wx + x, s.wy + y, 8, 64, 51);
      p.px(x, y, ditherPick([MOUNTAIN[1], MOUNTAIN[1], MOUNTAIN[2], MOUNTAIN[2], MOUNTAIN[3]], n, x, y, 0.5));
    }
  }
  grassFringe(p, grassySides, s, MOUNTAIN[0], 1.8);
}

/** A craggy triangular peak: lit west face, shadowed east face, snowy tip, rock strata. */
function peak(p: Painter, ax: number, baseY: number, halfW: number, h: number, minX: number, maxX: number): void {
  const apexY = baseY - h;
  // Squeeze each flank independently so the peak fits between minX and maxX.
  const leftW = Math.min(halfW, ax - minX);
  const rightW = Math.min(halfW, maxX - ax);
  for (let y = Math.max(0, apexY); y < Math.min(16, baseY); y++) {
    const t = (y - apexY + 0.5) / h; // 0 at apex, 1 at base
    const jag = t > 0.3 ? ((y * 7) % 3) * 0.35 : 0;
    const left = Math.round(ax - leftW * t - jag);
    const right = Math.round(ax + rightW * t * 0.95 + jag);
    const hw = (right - left) / 2;
    const ridge = ax + Math.round(Math.sin(y * 1.3) * 0.6 * t);
    for (let x = Math.max(0, left); x <= Math.min(15, right); x++) {
      let c: string;
      if (x === left || x === right) c = MOUNTAIN[0];
      else if (x < ridge) {
        const edgeLight = (ridge - x) / Math.max(1, ridge - left);
        c = ditherPick([MOUNTAIN[3], MOUNTAIN[4], MOUNTAIN[4]], 1 - edgeLight * 0.7, x, y, 0.5);
        if ((x + y * 2) % 9 === 0 && t > 0.35) c = MOUNTAIN[2]; // strata
      } else if (x === ridge) c = MOUNTAIN[4];
      else c = ditherPick([MOUNTAIN[1], MOUNTAIN[2]], 0.6 - (x - ridge) / (hw + 1) * 0.5, x, y, 0.5);
      // Snow cap on the top quarter.
      if (t < 0.28 && x !== left && x !== right) c = x <= ridge ? MOUNTAIN[5] : MOUNTAIN[3];
      p.px(x, y, c);
    }
  }
}

// --- beach & road ---------------------------------------------------------------------------------

const grassyMask = (nb: TileNeighborhood) => neighbourMask(nb, isGrassy);

export const sand: TileDef = {
  phased: true,
  variants: 3,
  mask: grassyMask,
  paint(p, s) {
    sandBase(p, s.wx, s.wy);
    if (s.variant === 0) {
      // A little shell.
      const x = 3 + p.int(9);
      const y = 3 + p.int(9);
      p.px(x, y, '#f8e8e0');
      p.px(x + 1, y, '#e8a8a0');
      p.px(x, y + 1, SAND[1]);
    }
    grassFringe(p, s.mask, s, SAND[1]);
  },
};

export const path: TileDef = {
  phased: true,
  variants: 2,
  mask: grassyMask,
  paint(p, s) {
    dirtBase(p, s.wx, s.wy);
    // Faint wheel ruts.
    if (s.variant === 1) for (let i = 0; i < 3; i++) p.px(4 + p.int(8), p.int(16), DIRT[1]);
    grassFringe(p, s.mask, s, DIRT[0]);
  },
};

// --- location icons ---------------------------------------------------------------------------------

const HOUSE_ROWS = [
  '..ooo..',
  '.ohrRo.',
  'ohrrrRo',
  'oRRRRRo',
  'owgdwWo',
  'owwdwWo',
  'ooooooo',
];

const BIG_HOUSE_ROWS = [
  '...ooo...',
  '..ohrRo..',
  '.ohrrrRo.',
  'ohrrrrrRo',
  'oRRRRRRRo',
  'owgwdwgWo',
  'owwwdwwWo',
  'ooooooooo',
];

function houseSprite(rows: string[], roof: readonly string[]): HTMLCanvasElement {
  return spriteFromRows(rows, {
    o: INK, h: roof[4], r: roof[3], R: roof[2], w: PLASTER[3], W: PLASTER[1], d: WOOD[1], g: GLASS[3],
  });
}

let townSprites: HTMLCanvasElement[] | null = null;
function getTownSprites(): HTMLCanvasElement[] {
  townSprites ??= [
    houseSprite(HOUSE_ROWS, ROOF),
    houseSprite(HOUSE_ROWS, CLOTH_BLUE),
    houseSprite(BIG_HOUSE_ROWS, ROOF),
  ];
  return townSprites;
}

/** Overworld town marker: a cluster of three cottages on the meadow. */
export const town: TileDef = {
  phased: true,
  paint(p, s) {
    grassBase(p, s.wx, s.wy);
    const [red, blue, big] = getTownSprites();
    const placements: [HTMLCanvasElement, number, number][] = [[red, 1, 0], [blue, 8, 1], [big, 3, 7]];
    for (const [img, x, y] of placements) {
      p.rect(x + 1, y + img.height - 1, img.width, 2, GRASS[1]); // shadow
      p.stamp(img, x, y);
    }
    p.px(13, 12, DIRT[2]);
    p.px(12, 13, DIRT[2]);
    p.px(13, 14, DIRT[1]);
  },
};

/** A rocky knoll with a dark cave opening at its foot. */
const IN_MOUNTAINS = 1 << 8;

export const caveEntrance: TileDef = {
  phased: true,
  // Set into a mountain range it sits on scree; out in the open it sits on grass.
  mask(nb) {
    const mountains = [nb.at(0, -1), nb.at(1, 0), nb.at(0, 1), nb.at(-1, 0)].filter((id) => id === 'mountain').length;
    return mountains >= 2 ? IN_MOUNTAINS | grassyMask(nb) : 0;
  },
  paint(p, s) {
    if (has(s.mask, IN_MOUNTAINS)) paintMountainBase(p, s, s.mask & 0xff);
    else grassBase(p, s.wx, s.wy);
    p.ellipse(9, 10, 8, 6, (_x, y) => (y >= 12 ? GRASS[1] : null)); // shadow
    const ramp = [MOUNTAIN[1], MOUNTAIN[2], MOUNTAIN[3], MOUNTAIN[4], MOUNTAIN[5]];
    p.ellipse(8, 9, 8, 8, (x, y, nx, ny) => {
      if (y > 14) return null;
      const r = Math.hypot(nx, ny);
      const light = -(nx * 0.6 + ny * 0.8);
      if (r > 0.88 || y === 14) return MOUNTAIN[0];
      let c = ditherPick(ramp, 0.4 + light * 0.45, x, y, 0.5);
      if ((x * 5 + y * 3) % 11 === 0) c = MOUNTAIN[1]; // cracks
      return c;
    });
    // The opening: an arch with a lighter stone rim and a deep dark interior.
    p.ellipse(8, 14, 4.5, 6, (_x, y, nx) => {
      if (y > 13) return null;
      const r = Math.abs(nx);
      return r > 0.75 ? MOUNTAIN[0] : y < 10 ? CAVE_ROCK[1] : INK;
    });
    p.ellipse(8, 14, 5.5, 7, (_x, y, nx, ny) => (y <= 13 && Math.hypot(nx, ny) > 0.86 && ny < 0 ? MOUNTAIN[4] : null));
  },
};

export const OVERWORLD_TILES: Partial<Record<TileId, TileDef>> = {
  grass, flowers, forest, hills, mountain, sand, path, town, cave_entrance: caveEntrance,
};
