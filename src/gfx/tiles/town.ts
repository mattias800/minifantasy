/** Town exterior tiles: plaza, greenery, fences, houses (roof + facade pieces), well and street lamp. */
import {
  CANOPY, CLAY, CLOTH_BLUE, COBBLE, CRYSTAL, FIRE, GLASS, GOLD, GRASS, INK, IRON, LINEN, PLASTER, ROOF, RUG, STONE,
  TRUNK, WOOD,
} from './palette';
import { leafCluster } from './foliage';
import { Painter } from './painter';
import { SHADOW_ON, cobbleBase, grassFringe, groundedTile, isGrassy } from './textures';
import {
  E, N, NE, NW, S, W, has, neighbourMask, oneOf, type TileDef, type TileId, type TileNeighborhood,
} from './types';

// --- plaza & greenery ---------------------------------------------------------------------

export const cobble: TileDef = {
  phased: true,
  mask: (nb) => neighbourMask(nb, isGrassy),
  paint(p, s) {
    cobbleBase(p, s.wx, s.wy);
    grassFringe(p, s.mask, s, COBBLE[0]);
  },
};

/** A single round deciduous tree: lumpy crown over a short trunk. */
export const tree = groundedTile({
  variants: 2,
  paint(p, s, ground) {
    p.ellipse(8.5, 14, 6, 2, () => SHADOW_ON[ground]);
    // Trunk with root flare.
    p.rect(6, 9, 4, 6, TRUNK[1]);
    p.vline(6, 9, 5, TRUNK[3]);
    p.vline(7, 9, 5, TRUNK[2]);
    p.vline(9, 9, 6, TRUNK[0]);
    p.px(5, 14, TRUNK[1]);
    p.px(10, 14, TRUNK[0]);
    const lean = s.variant === 0 ? 0 : 1;
    leafCluster(p, [
      [8 + lean, 3.5, 4],
      [4.5, 6, 4],
      [11.5 + lean, 6, 4],
      [8, 8, 4.5],
      [4.5 + lean, 9.5, 3],
      [12, 9.5, 3],
    ]);
  },
});

export const bush = groundedTile({
  variants: 3,
  paint(p, s, ground) {
    p.ellipse(8.5, 13.5, 7, 2.2, () => SHADOW_ON[ground]);
    leafCluster(p, [
      [5, 10, 3.5],
      [11, 10, 3.5],
      [8, 8.5, 4],
      [8, 11.5, 3.5],
    ]);
    if (s.variant === 0) {
      // Berries.
      for (const [x, y] of [[5, 9], [10, 8], [8, 11], [12, 11]]) {
        p.px(x, y, RUG[3]);
        p.px(x, y - 1, '#f8a0a0');
      }
    } else if (s.variant === 1) {
      for (const [x, y] of [[6, 8], [11, 10]]) p.px(x, y, CANOPY[5]);
    }
  },
});

// --- fence ------------------------------------------------------------------------------------

/** Wooden post-and-rail fence that links up with fence tiles in all four directions. */
export const fence = groundedTile({
  extraMask: (nb) => neighbourMask(nb, (id) => id === 'fence') & (N | E | S | W),
  paint(p, _s, ground, links) {
    const shadow = SHADOW_ON[ground];
    const x0 = has(links, W) ? 0 : 7;
    const x1 = has(links, E) ? 16 : 9;
    if (has(links, W) || has(links, E)) {
      p.rect(x0, 12, x1 - x0, 1, shadow);
      for (const y of [6, 9]) {
        p.rect(x0, y, x1 - x0, 2, WOOD[3]);
        p.hline(x0, y, x1 - x0, WOOD[4]);
        p.hline(x0, y + 2, x1 - x0, WOOD[0]);
      }
    }
    if (has(links, N)) verticalRail(p, 0, 5, shadow);
    if (has(links, S)) verticalRail(p, 11, 16, shadow);
    fencePost(p, 6, 3, shadow);
  },
});

function verticalRail(p: Painter, y0: number, y1: number, shadow: string): void {
  p.vline(9, y0, y1 - y0, shadow);
  p.rect(7, y0, 2, y1 - y0, WOOD[3]);
  p.vline(7, y0, y1 - y0, WOOD[4]);
}

function fencePost(p: Painter, x: number, y: number, shadow: string): void {
  p.rect(x + 1, y + 10, 4, 1, shadow);
  p.rect(x, y, 4, 10, WOOD[0]);
  p.rect(x + 1, y + 1, 2, 8, WOOD[3]);
  p.vline(x + 1, y + 1, 8, WOOD[4]);
  p.hline(x + 1, y + 1, 2, WOOD[5]);
}

// --- houses: roof ---------------------------------------------------------------------------------

const isFacade = oneOf('wall', 'window', 'door', 'wall_sign_inn', 'wall_sign_item');
const EAVE = 1 << 8;

/**
 * Terracotta roof seen from the front: rows of rounded tiles, a ridge cap on
 * top, verge trims on open sides and a shadowed eave above the facade.
 */
export const roof: TileDef = {
  variants: 8,
  mask: (nb) => neighbourMask(nb, (id) => id === 'roof') | (isFacade(nb.at(0, 1)) ? EAVE : 0),
  paint(p, s) {
    roofShingles(p);
    const m = s.mask;
    if (!has(m, N)) roofRidge(p);
    if (!has(m, W)) {
      p.vline(0, 0, 16, INK);
      p.vline(1, 0, 16, ROOF[5]);
      p.vline(2, 0, 16, ROOF[2]);
    }
    if (!has(m, E)) {
      p.vline(15, 0, 16, INK);
      p.vline(14, 0, 16, ROOF[1]);
    }
    if (has(m, EAVE)) {
      p.hline(0, 13, 16, ROOF[2]);
      p.hline(0, 14, 16, ROOF[1]);
      p.hline(0, 15, 16, INK);
    } else if (!has(m, S)) {
      p.hline(0, 14, 16, ROOF[1]);
      p.hline(0, 15, 16, INK);
    }
    const chimney = s.variant === 0 && !has(m, N) && has(m, W) && has(m, E) && has(m, NW) && has(m, NE);
    if (chimney) roofChimney(p);
  },
};

/**
 * Barrel-tile terracotta: vertical ribs (lit crest, shadowed groove) broken
 * into courses every 4px, each course's lower lip casting a thin shadow.
 */
function roofShingles(p: Painter): void {
  const RIB = [ROOF[2], ROOF[4], ROOF[3], ROOF[3]];
  for (let y = 0; y < 16; y++) {
    const course = y & 3;
    for (let x = 0; x < 16; x++) {
      const m = x & 3;
      let c = RIB[m];
      if (course === 0 && m === 1) c = ROOF[5];
      if (course === 3) c = m === 0 ? INK : ROOF[1];
      else if (course === 2 && m !== 0) c = m === 1 ? ROOF[3] : ROOF[2];
      p.px(x, y, c);
    }
  }
}

function roofRidge(p: Painter): void {
  p.hline(0, 0, 16, INK);
  p.rect(0, 1, 16, 2, ROOF[4]);
  p.hline(0, 1, 16, ROOF[5]);
  p.hline(0, 3, 16, ROOF[0]);
  for (let x = 3; x < 16; x += 6) p.vline(x, 1, 2, ROOF[2]);
}

function roofChimney(p: Painter): void {
  p.rect(9, 0, 5, 8, INK);
  p.rect(10, 1, 3, 6, STONE[3]);
  p.vline(10, 1, 6, STONE[4]);
  p.vline(12, 1, 6, STONE[2]);
  p.hline(9, 2, 5, STONE[1]);
  p.hline(9, 8, 5, ROOF[1]);
}

// --- houses: facade ----------------------------------------------------------------------------------

const FACADE_LEFT = 1;
const FACADE_RIGHT = 2;
const FACADE_UNDER_ROOF = 4;

function facadeMask(nb: TileNeighborhood): number {
  return (isFacade(nb.at(-1, 0)) ? 0 : FACADE_LEFT) |
    (isFacade(nb.at(1, 0)) ? 0 : FACADE_RIGHT) |
    (nb.at(0, -1) === 'roof' ? FACADE_UNDER_ROOF : 0);
}

/**
 * Half-timbered front wall: plaster between a top beam and a stone plinth,
 * corner posts on the building's outer edges, eave shadow under the roof.
 */
function paintFacade(p: Painter, mask: number, variant = -1): void {
  p.rect(0, 0, 16, 16, PLASTER[3]);
  for (let i = 0; i < 6; i++) p.px(p.int(16), 4 + p.int(7), PLASTER[2]);
  // Top beam.
  p.rect(0, 0, 16, 3, WOOD[2]);
  p.hline(0, 0, 16, WOOD[3]);
  p.hline(0, 3, 16, PLASTER[1]);
  if (has(mask, FACADE_UNDER_ROOF)) p.rect(0, 0, 16, 2, WOOD[0]);
  if (variant === 1) timberBrace(p);
  if (variant === 2) ivy(p);
  stonePlinth(p);
  if (has(mask, FACADE_LEFT)) cornerPost(p, 0, true);
  if (has(mask, FACADE_RIGHT)) cornerPost(p, 14, false);
}

function stonePlinth(p: Painter): void {
  p.rect(0, 12, 16, 4, STONE[2]);
  p.hline(0, 12, 16, STONE[4]);
  for (let row = 0; row < 2; row++) {
    const y = 13 + row * 2;
    p.hline(0, y + 1, 16, STONE[1]);
    for (let x = row * 3; x < 16; x += 6) p.px(x, y, STONE[1]);
    for (let x = row * 3 + 1; x < 16; x += 6) p.px(x, y, STONE[3]);
  }
  p.hline(0, 11, 16, PLASTER[1]);
}

function cornerPost(p: Painter, x: number, lit: boolean): void {
  p.rect(x, 0, 2, 12, WOOD[2]);
  p.vline(x, 0, 12, lit ? WOOD[4] : WOOD[1]);
  p.vline(lit ? x : x + 1, 0, 16, lit ? WOOD[3] : INK);
}

function timberBrace(p: Painter): void {
  for (let i = 0; i < 8; i++) {
    p.px(4 + i, 10 - i, WOOD[2]);
    p.px(5 + i, 10 - i, WOOD[1]);
  }
}

function ivy(p: Painter): void {
  const leaves = [[2, 11], [3, 10], [2, 9], [4, 8], [3, 7], [5, 9], [4, 6], [5, 5]];
  for (const [x, y] of leaves) {
    p.px(x, y, GRASS[3]);
    p.px(x + 1, y, GRASS[2]);
  }
  p.px(4, 5, GRASS[5]);
  p.px(3, 9, GRASS[5]);
}

export const wall: TileDef = {
  variants: 5,
  mask: facadeMask,
  paint(p, s) {
    // Variants 0, 3, 4 are plain so braces and ivy stay occasional accents.
    paintFacade(p, s.mask, s.variant);
  },
};

export const window: TileDef = {
  mask: facadeMask,
  paint(p, s) {
    paintFacade(p, s.mask);
    // Shutters.
    for (const x of [2, 12]) {
      p.rect(x, 4, 2, 7, CLOTH_BLUE[2]);
      p.vline(x, 4, 7, CLOTH_BLUE[3]);
      p.px(x + 1, 6, CLOTH_BLUE[1]);
      p.px(x + 1, 8, CLOTH_BLUE[1]);
    }
    // Frame and glass with a diagonal reflection.
    p.rect(4, 4, 8, 7, WOOD[1]);
    p.rect(5, 5, 6, 5, GLASS[1]);
    p.rect(5, 5, 6, 2, GLASS[2]);
    p.px(6, 5, GLASS[4]);
    p.px(5, 6, GLASS[4]);
    p.px(9, 7, GLASS[3]);
    p.vline(7, 5, 5, WOOD[2]);
    p.hline(5, 7, 6, WOOD[2]);
    // Flower box.
    p.rect(3, 11, 10, 2, CLAY[1]);
    p.hline(3, 11, 10, CLAY[3]);
    for (const [x, c] of [[4, RUG[4]], [6, GOLD[3]], [8, RUG[4]], [10, '#f8f0f8']] as const) {
      p.px(x, 10, c);
      p.px(x + 1, 10, GRASS[3]);
    }
  },
};

export const door: TileDef = {
  mask: facadeMask,
  paint(p, s) {
    paintFacade(p, s.mask);
    // Stone frame with an arched top.
    p.rect(3, 4, 10, 12, STONE[2]);
    p.hline(4, 3, 8, STONE[3]);
    p.rect(4, 5, 8, 11, INK);
    // Planks.
    p.rect(5, 5, 6, 11, WOOD[3]);
    p.px(5, 5, INK);
    p.px(10, 5, INK);
    for (const x of [6, 8]) p.vline(x + 1, 6, 10, WOOD[1]);
    p.vline(5, 6, 10, WOOD[4]);
    p.hline(5, 8, 6, WOOD[2]);
    p.hline(5, 12, 6, WOOD[2]);
    // Handle.
    p.px(9, 10, GOLD[3]);
    p.px(9, 11, GOLD[1]);
    // Doorstep.
    p.hline(3, 15, 10, STONE[4]);
  },
};

/** Facade with a hanging sign; `pictogram` draws into the 8x6 area at (4, 6). */
function signTile(pictogram: (p: Painter) => void): TileDef {
  return {
    mask: facadeMask,
    paint(p, s) {
      paintFacade(p, s.mask);
      // Wrought iron bracket and chains.
      p.hline(2, 3, 12, IRON[1]);
      p.px(2, 4, IRON[1]);
      p.px(13, 4, IRON[2]);
      p.px(4, 4, IRON[3]);
      p.px(11, 4, IRON[3]);
      // Board.
      p.rect(2, 5, 12, 8, INK);
      p.rect(3, 5, 10, 7, WOOD[4]);
      p.hline(3, 5, 10, WOOD[5]);
      p.hline(3, 11, 10, WOOD[2]);
      pictogram(p);
      p.hline(3, 13, 11, PLASTER[1]); // soft shadow on the wall
    },
  };
}

/** Bed pictogram: headboard, pillow and a red blanket. */
export const wallSignInn = signTile((p) => {
  p.rect(4, 7, 1, 4, WOOD[1]);
  p.rect(5, 8, 2, 2, LINEN[3]);
  p.px(5, 9, LINEN[1]);
  p.rect(7, 8, 5, 2, RUG[3]);
  p.hline(7, 8, 5, RUG[4]);
  p.hline(4, 10, 8, WOOD[1]);
  p.px(11, 10, WOOD[1]);
});

/** Potion pictogram: round flask with blue liquid and a cork. */
export const wallSignItem = signTile((p) => {
  p.px(8, 6, CLAY[3]);
  p.px(7, 6, CLAY[2]);
  p.rect(7, 7, 2, 1, LINEN[2]);
  p.rect(6, 8, 4, 3, CRYSTAL[2]);
  p.hline(5, 9, 6, CRYSTAL[2]);
  p.hline(6, 8, 4, LINEN[2]);
  p.px(6, 9, CRYSTAL[4]);
  p.hline(6, 11, 4, CRYSTAL[1]);
  p.px(5, 8, INK);
  p.px(10, 8, INK);
});

// --- well & lamp ------------------------------------------------------------------------------------

/** Round stone well with a windlass: posts, crossbar, rope and bucket. */
export const well = groundedTile({
  fallback: 'cobble',
  paint(p, _s, ground) {
    p.ellipse(9, 13, 7.5, 2.5, () => SHADOW_ON[ground]);
    wellDrum(p);
    for (const x of [1, 14]) {
      p.rect(x, 0, 1, 8, WOOD[1]);
      p.px(x, 7, INK);
    }
    p.rect(1, 1, 14, 2, WOOD[3]);
    p.hline(1, 1, 14, WOOD[4]);
    p.hline(1, 3, 14, WOOD[0]);
    p.vline(8, 4, 2, LINEN[0]);
    p.rect(7, 5, 3, 2, WOOD[2]);
    p.hline(7, 5, 3, IRON[3]);
    p.px(9, 6, WOOD[0]);
  },
});

/** Stone drum seen in 3/4 view: curved brick front, lit rim ring and dark water. */
function wellDrum(p: Painter): void {
  const cx = 8;
  const rimY = 7;
  const rx = 7;
  for (let x = 1; x <= 15; x++) {
    const t = (x + 0.5 - cx) / rx;
    if (Math.abs(t) > 1) continue;
    const bottom = Math.round(rimY + 3 + Math.sqrt(1 - t * t) * 2);
    for (let y = rimY; y <= bottom; y++) {
      const course = (y - rimY) >> 1;
      const seam = (x + course * 2) % 4 === 0;
      let c = (y - rimY) % 2 === 1 ? STONE[1] : seam ? STONE[1] : t < -0.3 ? STONE[3] : STONE[2];
      if (y === bottom || Math.abs(t) > 0.92) c = INK;
      p.px(x, y, c);
    }
  }
  p.ellipse(cx, rimY, rx, 3.5, (x, _y, nx, ny) => {
    const r = Math.hypot(nx, ny);
    if (r > 0.88) return INK;
    if (r > 0.55) return ny < 0.2 ? ((x & 1) === 0 ? STONE[5] : STONE[4]) : STONE[3];
    return null;
  });
  p.ellipse(cx, rimY, 4.5, 2, (x, y) => (x === 6 && y === rimY - 1 ? CRYSTAL[3] : y < rimY ? '#081020' : '#10224a'));
}

/** Iron street lamp whose lantern flickers gently. */
export const lamp = groundedTile({
  fallback: 'cobble',
  frames: 2,
  frameMs: 380,
  paint(p, s, ground) {
    p.ellipse(9, 14.5, 3.5, 1.3, () => SHADOW_ON[ground]);
    p.rect(6, 13, 4, 2, IRON[1]);
    p.hline(6, 13, 4, IRON[3]);
    p.rect(7, 5, 2, 8, IRON[1]);
    p.vline(7, 5, 8, IRON[3]);
    // Lantern.
    const glow = s.frame === 0 ? [FIRE[4], FIRE[5]] : [FIRE[3], FIRE[4]];
    p.rect(5, 1, 6, 5, INK);
    p.rect(6, 2, 4, 3, glow[0]);
    p.rect(7, 2, 2, 2, glow[1]);
    p.hline(5, 0, 6, IRON[2]);
    p.hline(6, 0, 4, IRON[3]);
    p.px(8, 6, IRON[2]);
    // Soft halo.
    for (const [x, y] of [[4, 2], [11, 3], [4, 4], [11, 1], [3, 3], [12, 3]]) {
      if ((x + y + s.frame) % 2 === 0) p.px(x, y, FIRE[4]);
    }
  },
});

export const TOWN_TILES: Partial<Record<TileId, TileDef>> = {
  cobble, tree, bush, fence, roof, wall, window, door,
  wall_sign_inn: wallSignInn, wall_sign_item: wallSignItem, well, lamp,
};
