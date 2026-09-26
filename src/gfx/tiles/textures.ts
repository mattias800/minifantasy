/**
 * Seamless ground textures (grass, dirt, sand, cobble, planks, cave floor) and
 * the shared "ground under an object" logic used by trees, fences, lamps etc.
 * Textures are sampled in world-periodic coordinates (wx + x, wy + y).
 */
import { CAVE_FLOOR, COBBLE, DIRT, FLOOR, GRASS, SAND } from './palette';
import { Painter, ditherPick, hash01, hash2, periodicNoise, voronoi } from './painter';
import { N, E, S, W, NE, SE, SW, NW, has, type TileDef, type TileId, type TileNeighborhood, type TileState } from './types';

const PERIOD = 64;

/** Two octaves of periodic noise, a good default for organic ground. */
function groundNoise(x: number, y: number, seed: number): number {
  return periodicNoise(x, y, 16, PERIOD, seed) * 0.65 + periodicNoise(x, y, 8, PERIOD, seed + 1) * 0.35;
}

// --- grass ------------------------------------------------------------------------

/** Lush grass: large soft patches in three greens with dithered transitions. */
export function grassBase(p: Painter, wx: number, wy: number): void {
  const tones = [GRASS[2], GRASS[3], GRASS[3], GRASS[4]];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = groundNoise(wx + x, wy + y, 11);
      p.px(x, y, ditherPick(tones, n, x, y, 0.35));
    }
  }
}

/** A tiny grass tuft: two dark blades with a light tip, anchored at its bottom-left. */
function grassTuft(p: Painter, x: number, y: number): void {
  p.px(x, y, GRASS[1]);
  p.px(x + 1, y - 1, GRASS[1]);
  p.px(x + 2, y, GRASS[1]);
  p.px(x + 1, y - 2, GRASS[5]);
  p.px(x - 1, y - 1, GRASS[4]);
}

/** Scatters `count` tufts at random (tile-seeded) positions, avoiding the borders. */
export function scatterTufts(p: Painter, count: number): void {
  for (let i = 0; i < count; i++) grassTuft(p, 2 + p.int(11), 3 + p.int(12));
}

// --- dirt / sand --------------------------------------------------------------------

export function dirtBase(p: Painter, wx: number, wy: number): void {
  const tones = [DIRT[1], DIRT[2], DIRT[2], DIRT[3]];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      p.px(x, y, ditherPick(tones, groundNoise(wx + x, wy + y, 21), x, y, 0.4));
    }
  }
  pebbles(p, DIRT, 3);
}

export function sandBase(p: Painter, wx: number, wy: number): void {
  const tones = [SAND[2], SAND[3], SAND[3], SAND[4]];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      p.px(x, y, ditherPick(tones, groundNoise(wx + x, wy + y, 31), x, y, 0.45));
    }
  }
  // Fine grain specks.
  for (let i = 0; i < 5; i++) p.px(p.int(16), p.int(16), SAND[1]);
}

/** Small two-pixel stones: dark base with a light top. */
function pebbles(p: Painter, ramp: readonly string[], count: number): void {
  for (let i = 0; i < count; i++) {
    const x = 1 + p.int(13);
    const y = 1 + p.int(13);
    p.px(x, y + 1, ramp[0]);
    p.px(x + 1, y + 1, ramp[1]);
    p.px(x, y, ramp[4]);
    p.px(x + 1, y, ramp[3]);
  }
}

// --- cobble -------------------------------------------------------------------------

/**
 * Rounded cobblestones from world-periodic Voronoi cells: dark mortar where
 * cells meet, each stone lit on its top-left and a little darker bottom-right.
 */
export function cobbleBase(p: Painter, wx: number, wy: number): void {
  const cells = 12; // per 64px period, i.e. stones about 5px across
  const size = PERIOD / cells;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = voronoi(wx + x + 0.5, wy + y + 0.5, size, size, cells, cells, 5);
      const edge = v.d2 - v.d1;
      let c: string;
      if (edge < 0.9) c = COBBLE[1];
      else {
        const light = -(v.dx * 0.6 + v.dy * 0.8) / size;
        const tone = ((v.cell >> 16) % 3) * 0.12;
        c = ditherPick([COBBLE[2], COBBLE[3], COBBLE[3], COBBLE[4]], 0.35 + tone + light * 0.9, x, y, 0.3);
        if (edge < 1.8 && light < -0.05) c = COBBLE[2];
      }
      p.px(x, y, c);
    }
  }
}

// --- wooden floor ---------------------------------------------------------------------

/** Warm floorboards: 4px tall boards with staggered, world-aligned butt joints. */
export function floorBase(p: Painter, wx: number, wy: number): void {
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const worldRow = (wy + y) / 4;
    const shade = hash01(worldRow, 0, 3) < 0.5 ? 0 : 1;
    p.rect(0, y, 16, 4, FLOOR[3 + shade]);
    p.hline(0, y, 16, FLOOR[4 + shade]);
    p.hline(0, y + 3, 16, FLOOR[1]);
    // One short grain streak per board segment.
    const gx = hash2(worldRow, wx >> 4, 6) % 12;
    p.hline(gx, y + 1 + (gx & 1), 3 + (gx % 3), FLOOR[2 + shade]);
    // One joint every 32 world px, offset per row.
    const offset = hash2(worldRow, 7) % 32;
    for (let x = 0; x < 16; x++) {
      if ((wx + x + offset) % 32 === 0) {
        p.vline(x, y, 3, FLOOR[1]);
        p.px(x + 1, y + 1, FLOOR[5]);
      }
    }
  }
}

// --- cave floor -----------------------------------------------------------------------

export function caveFloorBase(p: Painter, wx: number, wy: number): void {
  const tones = [CAVE_FLOOR[1], CAVE_FLOOR[2], CAVE_FLOOR[2], CAVE_FLOOR[3]];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      p.px(x, y, ditherPick(tones, groundNoise(wx + x, wy + y, 41), x, y, 0.4));
    }
  }
  // A hairline crack wandering diagonally, with a lit lower lip.
  if (p.chance(0.5)) {
    let x = 3 + p.int(9);
    let y = 3 + p.int(8);
    const dir = p.chance(0.5) ? 1 : -1;
    for (let i = 0; i < 5; i++) {
      p.px(x, y, CAVE_FLOOR[0]);
      p.px(x, y + 1, CAVE_FLOOR[3]);
      if (i % 2 === 0) x += dir;
      else y += 1;
    }
  }
  pebbles(p, CAVE_FLOOR, 2);
}

// --- ground under objects ---------------------------------------------------------------

/** Grounds that objects (trees, lamps, wells, ...) can stand on. */
export const GROUNDS = ['grass', 'cobble', 'path', 'sand', 'floor', 'cave_floor'] as const;
export type Ground = (typeof GROUNDS)[number];

/** Encodes the ground under an object as a small integer for tile masks. */
export const groundIndex = (g: Ground): number => GROUNDS.indexOf(g);
export const groundAt = (index: number): Ground => GROUNDS[index] ?? 'grass';

const GROUND_OF: Partial<Record<TileId, Ground>> = {
  grass: 'grass', flowers: 'grass', hills: 'grass', tree: 'grass', bush: 'grass',
  cobble: 'cobble', path: 'path', sand: 'sand',
  floor: 'floor', rug: 'floor', mat: 'floor',
  cave_floor: 'cave_floor', rock: 'cave_floor', cave_mouth: 'cave_floor',
};

const DIRECT_NEIGHBOURS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Picks the most common ground among the four direct neighbours (ties favour the GROUNDS order). */
export function groundOf(nb: TileNeighborhood, fallback: Ground = 'grass'): Ground {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const [dx, dy] of DIRECT_NEIGHBOURS) {
    const g = GROUND_OF[nb.at(dx, dy)];
    if (g) counts[groundIndex(g)]++;
  }
  let best = fallback;
  let bestCount = 0;
  counts.forEach((c, i) => {
    if (c > bestCount) [best, bestCount] = [GROUNDS[i], c];
  });
  return best;
}

export function paintGround(p: Painter, ground: Ground, s: TileState): void {
  switch (ground) {
    case 'grass': return grassBase(p, s.wx, s.wy);
    case 'cobble': return cobbleBase(p, s.wx, s.wy);
    case 'path': return dirtBase(p, s.wx, s.wy);
    case 'sand': return sandBase(p, s.wx, s.wy);
    case 'floor': return floorBase(p, s.wx, s.wy);
    case 'cave_floor': return caveFloorBase(p, s.wx, s.wy);
  }
}

// --- grass fringe ---------------------------------------------------------------------

export const isGrassy = (id: TileId): boolean =>
  id === 'grass' || id === 'flowers' || id === 'hills' || id === 'forest' || id === 'tree' || id === 'bush' ||
  id === 'town' || id === 'cave_entrance' || id === 'fence';

/**
 * Overlays a ragged grass border on the sides/corners of `mask` (8-neighbour
 * bits of grassy neighbours), so paths and beaches blend into meadows.
 * `shadow` is the ground colour used for the soft shadow cast by the grass;
 * `depth` scales how far the grass reaches in (1 = about 1-3px).
 */
export function grassFringe(p: Painter, mask: number, s: TileState, shadow: string, depth = 1): void {
  if (mask === 0) return;
  // Jagged edge depth that varies smoothly along the border (world aligned so neighbours agree).
  const edge = (along: number, side: number) => (1.2 + periodicNoise(along, side * 16, 4, PERIOD, 77) * 2.2) * depth;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let g = -9;
      let castsShadow = false;
      const consider = (v: number, shadowing: boolean) => {
        if (v > g) [g, castsShadow] = [v, shadowing];
      };
      if (has(mask, N)) consider(edge(s.wx + x, 0) - y, true);
      if (has(mask, S)) consider(edge(s.wx + x, 1) - (15 - y), false);
      if (has(mask, W)) consider(edge(s.wy + y, 2) - x, true);
      if (has(mask, E)) consider(edge(s.wy + y, 3) - (15 - x), false);
      // Corners: round outer corners (two grassy sides) and nibble inner ones (diagonal only).
      const corner = (bit: number, a: number, b: number, cx: number, cy: number, shadowing: boolean) => {
        const outer = has(mask, a) && has(mask, b);
        if (!outer && !has(mask, bit)) return;
        consider((outer ? 5.5 : 3) - Math.hypot(x + 0.5 - cx, y + 0.5 - cy), shadowing);
      };
      corner(NW, N, W, 0, 0, true);
      corner(NE, N, E, 16, 0, true);
      corner(SW, S, W, 0, 16, false);
      corner(SE, S, E, 16, 16, false);
      if (g > 0) p.px(x, y, g < 1 ? GRASS[2] : GRASS[3]);
      else if (g > -1 && castsShadow) p.px(x, y, shadow);
    }
  }
}

/** Colour for soft shadows cast by objects standing on each ground. */
export const SHADOW_ON: Record<Ground, string> = {
  grass: GRASS[1],
  cobble: COBBLE[0],
  path: DIRT[0],
  sand: SAND[1],
  floor: FLOOR[1],
  cave_floor: CAVE_FLOOR[0],
};

export interface GroundedOptions {
  /** Ground used when no neighbour offers a hint. */
  fallback?: Ground;
  variants?: number;
  frames?: number;
  frameMs?: number;
  /** Extra tile-specific mask bits (e.g. fence connections). */
  extraMask?(nb: TileNeighborhood): number;
  paint(p: Painter, s: TileState, ground: Ground, extra: number): void;
}

/**
 * Builds a tile for an object standing on the ground (tree, lamp, barrel, ...).
 * The ground is inferred from the neighbours so a tree on a plaza stands on
 * cobbles and the same tree in a meadow stands on grass.
 */
export function groundedTile(o: GroundedOptions): TileDef {
  return {
    phased: true,
    variants: o.variants,
    frames: o.frames,
    frameMs: o.frameMs,
    mask: (nb) => groundIndex(groundOf(nb, o.fallback)) | ((o.extraMask?.(nb) ?? 0) << 3),
    paint(p, s) {
      const ground = groundAt(s.mask & 7);
      paintGround(p, ground, s);
      o.paint(p, s, ground, s.mask >> 3);
    },
  };
}
