/** Interior tiles: floorboards, 3/4-view walls and furniture. */
import {
  CANOPY, CLAY, CLOTH_BLUE, FIRE, FLOOR, GOLD, GRASS, INK, IRON, LINEN, MAT, PANEL, RUG, RUG_TRIM, STONE,
  WALLPAPER, WOOD,
} from './palette';
import { leafCluster } from './foliage';
import { wallTop, type WallTopColors } from './walls';
import { Painter, hash2 } from './painter';
import { SHADOW_ON, floorBase, groundedTile, type GroundedOptions } from './textures';
import {
  E, N, S, W, has, neighbourMask, oneOf, type TileDef, type TileId,
} from './types';

/** Tiles that form (or hang on) an interior wall. */
const isInteriorWall = oneOf('int_wall', 'shelf', 'hearth');
/** Below a wall, these mean "no visible face" (another wall, or nothing at all). */
const hidesWallFace = oneOf('int_wall', 'shelf', 'hearth', 'void');

const FLOOR_SHADOW = 1;

export const floor: TileDef = {
  phased: true,
  mask: (nb) => (isInteriorWall(nb.at(0, -1)) ? FLOOR_SHADOW : 0),
  paint(p, s) {
    floorBase(p, s.wx, s.wy);
    if (has(s.mask, FLOOR_SHADOW)) wallShadow(p);
  },
};

/** Soft shadow at the foot of a wall face. */
function wallShadow(p: Painter): void {
  p.hline(0, 0, 16, FLOOR[0]);
  p.checker(0, 1, 16, 1, FLOOR[1]);
}

// --- walls ----------------------------------------------------------------------------------

const WALL_FACE = 1 << 8;

/**
 * Classic JRPG wall: where the tile below is not wall we see the front face
 * (wallpaper above wood wainscoting); otherwise we see the dark wall top, with
 * a lighter rim along edges that border the room.
 */
export const intWall: TileDef = {
  mask: (nb) => neighbourMask(nb, isInteriorWall) | (hidesWallFace(nb.at(0, 1)) ? 0 : WALL_FACE),
  paint(p, s) {
    if (has(s.mask, WALL_FACE)) wallFace(p);
    else wallTop(p, s.mask, INTERIOR_TOP);
  },
};

function wallFace(p: Painter): void {
  // Crown moulding.
  p.hline(0, 0, 16, PANEL[0]);
  p.hline(0, 1, 16, PANEL[4]);
  p.hline(0, 2, 16, PANEL[2]);
  // Striped wallpaper with a small diamond motif.
  p.rect(0, 3, 16, 6, WALLPAPER[3]);
  p.hline(0, 3, 16, WALLPAPER[1]);
  for (let x = 0; x < 16; x += 4) p.vline(x + 3, 4, 5, WALLPAPER[2]);
  for (let x = 1; x < 16; x += 8) {
    p.px(x, 5, WALLPAPER[4]);
    p.px(x + 4, 7, WALLPAPER[4]);
  }
  // Chair rail.
  p.hline(0, 9, 16, PANEL[4]);
  p.hline(0, 10, 16, PANEL[1]);
  // Wainscot panels.
  p.rect(0, 11, 16, 4, PANEL[2]);
  for (let x = 0; x < 16; x += 8) {
    p.rect(x + 1, 11, 6, 3, PANEL[3]);
    p.hline(x + 1, 13, 6, PANEL[1]);
    p.vline(x + 7, 11, 3, PANEL[1]);
  }
  p.hline(0, 15, 16, PANEL[0]);
}

const INTERIOR_TOP: WallTopColors = { base: '#1c120e', texture: '#24170f', rimLit: PANEL[2], rimShade: PANEL[1] };

// --- wall furniture -----------------------------------------------------------------------------

/** Book spine colours as [main, band] pairs. */
const BOOK_COLORS: readonly (readonly [string, string])[] = [
  [RUG[3], RUG[1]], [CLOTH_BLUE[3], CLOTH_BLUE[1]], [GRASS[3], GRASS[1]], [GOLD[2], GOLD[0]], ['#8a5ab8', '#4a2a70'], [LINEN[2], LINEN[0]],
];

/** Bookcase / goods shelf built into the wall face; neighbours merge into one long unit. */
export const shelf: TileDef = {
  variants: 3,
  mask: (nb) => (nb.at(-1, 0) === 'shelf' ? W : 0) | (nb.at(1, 0) === 'shelf' ? E : 0),
  paint(p, s) {
    wallFace(p);
    const x0 = has(s.mask, W) ? 0 : 1;
    const x1 = has(s.mask, E) ? 16 : 15;
    p.rect(x0, 1, x1 - x0, 15, WOOD[1]);
    p.rect(x0, 2, x1 - x0, 12, PANEL[0]);
    for (const y of [7, 13]) {
      p.rect(x0, y, x1 - x0, 2, WOOD[3]);
      p.hline(x0, y, x1 - x0, WOOD[4]);
    }
    p.hline(x0, 1, x1 - x0, WOOD[3]);
    if (!has(s.mask, W)) p.vline(1, 1, 15, WOOD[2]);
    if (!has(s.mask, E)) p.vline(14, 1, 15, WOOD[0]);
    const inner0 = has(s.mask, W) ? 0 : 2;
    const inner1 = has(s.mask, E) ? 16 : 14;
    for (const baseY of [7, 13]) {
      if (s.variant === 2 && baseY === 13) jars(p, inner0, inner1, baseY);
      else books(p, inner0, inner1, baseY);
    }
  },
};

function books(p: Painter, x0: number, x1: number, baseY: number): void {
  let x = x0;
  while (x < x1) {
    if (p.chance(0.1)) {
      x += 1; // a gap
      continue;
    }
    const w = Math.min(1 + p.int(2), x1 - x);
    const h = 4 + p.int(2);
    const [main, band] = BOOK_COLORS[p.int(BOOK_COLORS.length)];
    p.rect(x, baseY - h, w, h, main);
    p.hline(x, baseY - h + 1, w, band);
    p.px(x + w - 1, baseY - 1, band);
    x += w;
  }
}

function jars(p: Painter, x0: number, x1: number, baseY: number): void {
  const colors = [RUG[3], CLOTH_BLUE[3], GRASS[4], GOLD[3]];
  for (let x = x0 + 1; x + 3 <= x1; x += 4) {
    const c = colors[p.int(colors.length)];
    p.rect(x, baseY - 4, 3, 4, c);
    p.hline(x, baseY - 5, 3, CLAY[2]);
    p.px(x, baseY - 3, LINEN[3]);
    p.vline(x + 2, baseY - 4, 4, INK);
  }
}

const HEARTH_FRAMES = 4;

/** Stone fireplace set into the wall with a crackling animated fire. */
export const hearth: TileDef = {
  frames: HEARTH_FRAMES,
  frameMs: 250,
  paint(p, s) {
    wallFace(p);
    // Stone surround and wooden mantel.
    p.rect(1, 3, 14, 13, STONE[2]);
    for (let y = 4; y < 16; y += 3) {
      p.hline(1, y + 2, 14, STONE[1]);
      for (let x = 1 + (y % 2) * 2; x < 15; x += 4) p.px(x, y, STONE[3]);
    }
    p.rect(0, 1, 16, 3, WOOD[2]);
    p.hline(0, 1, 16, WOOD[4]);
    p.hline(0, 4, 16, WOOD[0]);
    // Firebox.
    p.rect(4, 7, 8, 9, INK);
    p.rect(5, 6, 6, 1, INK);
    fire(p, s.frame);
    // Logs.
    p.rect(4, 14, 8, 2, WOOD[1]);
    p.hline(5, 14, 6, WOOD[3]);
    p.px(6, 15, WOOD[0]);
  },
};

/** Flickering flame shape: per-column heights re-rolled every frame. */
function fire(p: Painter, frame: number): void {
  for (let x = 5; x <= 10; x++) {
    const centre = 3 - Math.abs(x - 7.5);
    const h = Math.max(1, Math.round(centre * 1.6 + (hash2(x, frame, 99) % 3)));
    for (let i = 0; i < h; i++) {
      const y = 13 - i;
      const t = i / h;
      const c = t > 0.8 ? FIRE[1] : t > 0.55 ? FIRE[2] : t > 0.3 ? FIRE[3] : FIRE[4];
      p.px(x, y, c);
    }
  }
  p.px(7 + (frame % 2), 13, FIRE[5]);
  // Warm glow on the surround.
  for (const x of [3, 12]) p.checker(x, 8 + (frame % 2), 1, 6, FIRE[1]);
}

// --- floor furniture --------------------------------------------------------------------------------

const onFloor = (o: Omit<GroundedOptions, 'fallback'>) => groundedTile({ ...o, fallback: 'floor' });

export const counter = onFloor({
  extraMask: (nb) => neighbourMask(nb, (id) => id === 'counter') & (N | E | S | W),
  paint(p, _s, ground, links) {
    const top = has(links, N) ? 0 : 2;
    const front = has(links, S) ? 16 : 9;
    const x0 = has(links, W) ? 0 : 1;
    const x1 = has(links, E) ? 16 : 15;
    // Counter top.
    p.rect(x0, top, x1 - x0, front - top, WOOD[4]);
    if (!has(links, N)) {
      p.hline(x0, top, x1 - x0, INK);
      p.hline(x0, top + 1, x1 - x0, WOOD[5]);
    }
    for (let x = x0 + 3; x < x1; x += 7) p.vline(x, top + 2, front - top - 3, WOOD[3]);
    // Front panel.
    if (!has(links, S)) {
      p.hline(x0, front, x1 - x0, WOOD[5]);
      p.rect(x0, front + 1, x1 - x0, 5, WOOD[2]);
      for (let x = x0 + 1; x < x1; x += 4) p.vline(x, front + 2, 3, WOOD[1]);
      p.hline(x0, 15, x1 - x0, WOOD[0]);
      p.hline(x0, 14, x1 - x0, SHADOW_ON[ground]);
      p.hline(x0, 15, x1 - x0, INK);
    }
    if (!has(links, W)) p.vline(0, top, 16 - top, INK);
    if (!has(links, E)) {
      p.vline(15, top, 16 - top, INK);
      p.vline(14, top + 1, 15 - top, WOOD[1]);
    }
  },
});

export const bed = onFloor({
  paint(p, _s, ground) {
    p.rect(14, 2, 2, 14, SHADOW_ON[ground]);
    // Frame.
    p.rect(2, 0, 12, 16, INK);
    p.rect(3, 1, 10, 3, WOOD[2]);
    p.hline(3, 1, 10, WOOD[4]);
    p.rect(2, 0, 2, 4, WOOD[3]);
    p.rect(12, 0, 2, 4, WOOD[1]);
    // Pillow.
    p.rect(4, 4, 8, 3, LINEN[3]);
    p.hline(4, 6, 8, LINEN[1]);
    p.px(4, 4, LINEN[2]);
    p.px(11, 4, LINEN[2]);
    // Folded sheet and blanket.
    p.rect(3, 7, 10, 1, LINEN[2]);
    p.rect(3, 8, 10, 6, CLOTH_BLUE[2]);
    p.hline(3, 8, 10, CLOTH_BLUE[3]);
    p.vline(12, 8, 6, CLOTH_BLUE[1]);
    for (let x = 4; x < 12; x += 3) p.px(x, 11, CLOTH_BLUE[4]);
    p.hline(3, 13, 10, CLOTH_BLUE[1]);
    // Footboard.
    p.rect(3, 14, 10, 1, WOOD[3]);
    p.hline(3, 15, 10, WOOD[1]);
  },
});

export const table = onFloor({
  variants: 4,
  extraMask: (nb) => (nb.at(-1, 0) === 'table' ? W : 0) | (nb.at(1, 0) === 'table' ? E : 0),
  paint(p, s, ground, links) {
    const openW = !has(links, W);
    const openE = !has(links, E);
    const x0 = openW ? 1 : 0;
    const x1 = openE ? 15 : 16;
    p.rect(x0 + 1, 14, x1 - x0, 1, SHADOW_ON[ground]);
    // Legs.
    if (openW) p.rect(2, 10, 2, 5, WOOD[1]);
    if (openE) p.rect(12, 10, 2, 5, WOOD[0]);
    // Top surface, front edge and outline.
    p.rect(x0, 2, x1 - x0, 9, INK);
    p.rect(x0 + (openW ? 1 : 0), 3, x1 - x0 - (openW ? 1 : 0) - (openE ? 1 : 0), 6, WOOD[4]);
    p.hline(x0 + 1, 3, x1 - x0 - 2, WOOD[5]);
    p.rect(x0 + (openW ? 1 : 0), 9, x1 - x0 - (openW ? 1 : 0) - (openE ? 1 : 0), 1, WOOD[2]);
    for (let x = x0 + 4; x < x1 - 1; x += 5) p.vline(x, 4, 5, WOOD[3]);
    tableItem(p, s.variant);
  },
});

function tableItem(p: Painter, variant: number): void {
  if (variant === 0) {
    // Candle.
    p.rect(7, 3, 2, 4, LINEN[3]);
    p.px(8, 3, LINEN[1]);
    p.px(7, 2, FIRE[4]);
    p.px(7, 1, FIRE[3]);
    p.px(6, 6, GOLD[2]);
    p.px(9, 6, GOLD[1]);
  } else if (variant === 1) {
    // Mug.
    p.rect(9, 4, 3, 3, WOOD[1]);
    p.hline(9, 4, 3, '#e8d8b0');
    p.px(12, 5, WOOD[1]);
  } else if (variant === 2) {
    // Plate with bread.
    p.rect(5, 5, 6, 2, LINEN[3]);
    p.rect(6, 4, 4, 2, GOLD[2]);
    p.hline(6, 4, 3, GOLD[3]);
  }
}

export const barrel = onFloor({
  paint(p, _s, ground) {
    p.ellipse(9, 14.5, 6, 1.5, () => SHADOW_ON[ground]);
    // Body: bulging staves, light on the left.
    for (let y = 3; y < 15; y++) {
      const bulge = y > 5 && y < 13 ? 1 : 0;
      const x0 = 3 - bulge;
      const x1 = 12 + bulge;
      for (let x = x0; x <= x1; x++) {
        const t = (x - x0) / (x1 - x0);
        let c = t < 0.2 ? WOOD[4] : t < 0.55 ? WOOD[3] : t < 0.85 ? WOOD[2] : WOOD[1];
        if (x === x0 || x === x1 || y === 14) c = INK;
        else if ((x - x0) % 3 === 0) c = WOOD[1];
        p.px(x, y, c);
      }
    }
    // Iron hoops.
    for (const y of [5, 11]) {
      p.hline(3, y, 10, IRON[2]);
      p.px(3, y, IRON[3]);
      p.px(4, y, IRON[3]);
    }
    // Lid.
    p.ellipse(8, 3.5, 5, 2.2, (_x, _y, nx, ny) => (Math.hypot(nx, ny) > 0.7 ? INK : ny < 0 ? WOOD[4] : WOOD[3]));
    p.hline(6, 3, 4, WOOD[2]);
  },
});

export const plant = onFloor({
  paint(p, _s, ground) {
    p.ellipse(8.5, 14.8, 4.5, 1.3, () => SHADOW_ON[ground]);
    // Clay pot.
    p.rect(5, 10, 7, 5, INK);
    p.rect(6, 11, 5, 3, CLAY[2]);
    p.vline(6, 11, 3, CLAY[3]);
    p.vline(10, 11, 3, CLAY[1]);
    p.rect(4, 9, 9, 2, CLAY[3]);
    p.hline(4, 10, 9, CLAY[1]);
    p.hline(5, 9, 7, '#e8a070');
    // Leaves.
    leafCluster(p, [[8, 3.5, 3], [5, 6, 3], [11, 6, 3], [8, 7, 2.8]]);
    p.px(2, 5, CANOPY[3]);
    p.px(3, 6, CANOPY[2]);
    p.px(14, 4, CANOPY[3]);
    p.px(13, 5, CANOPY[2]);
  },
});

/** Doormat marking an exit: woven border with a chevron pointing out of the room. */
export const mat = onFloor({
  paint(p) {
    p.rect(2, 4, 12, 9, MAT[0]);
    p.rect(3, 5, 10, 7, MAT[2]);
    p.checker(3, 5, 10, 7, MAT[1]);
    for (let i = 0; i < 4; i++) {
      p.px(4 + i, 6 + i, MAT[3]);
      p.px(11 - i, 6 + i, MAT[3]);
    }
    for (let x = 3; x < 13; x += 2) {
      p.px(x, 13, MAT[1]);
      p.px(x, 3, MAT[1]);
    }
  },
});

/** Woven rug whose border and tassels follow the rug's outline. */
export const rug: TileDef = {
  phased: true,
  mask: (nb) => neighbourMask(nb, (id) => id === 'rug'),
  paint(p, s) {
    floorBase(p, s.wx, s.wy);
    const m = s.mask;
    const x0 = has(m, W) ? 0 : 1;
    const x1 = has(m, E) ? 16 : 15;
    const y0 = has(m, N) ? 0 : 1;
    const y1 = has(m, S) ? 16 : 15;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // Distance to the nearest open (non-rug) side decides edge / trim / field.
        const edge = Math.min(
          has(m, N) ? 9 : y - y0, has(m, S) ? 9 : y1 - 1 - y,
          has(m, W) ? 9 : x - x0, has(m, E) ? 9 : x1 - 1 - x,
        );
        p.px(x, y, edge === 0 ? RUG[0] : edge === 1 ? RUG_TRIM[2] : rugColor(s.wx + x, s.wy + y));
      }
    }
    // Tassels on the short ends.
    if (!has(m, N)) for (let x = x0 + 1; x < x1 - 1; x += 2) p.px(x, 0, LINEN[2]);
    if (!has(m, S)) for (let x = x0 + 1; x < x1 - 1; x += 2) p.px(x, 15, LINEN[2]);
  },
};

/** World-aligned diamond lattice so multi-tile rugs show one continuous pattern. */
function rugColor(x: number, y: number): string {
  const dx = Math.abs((x & 7) - 3.5);
  const dy = Math.abs((y & 7) - 3.5);
  const d = dx + dy;
  if (d < 1.1) return RUG_TRIM[3];
  if (d > 2.9 && d < 4.1) return RUG[3];
  if (d >= 6) return RUG[1];
  return RUG[2];
}

export const INTERIOR_TILES: Partial<Record<TileId, TileDef>> = {
  floor, int_wall: intWall, counter, bed, table, shelf, barrel, rug, hearth, mat, plant,
};
