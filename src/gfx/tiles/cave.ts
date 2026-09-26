/** Cave / dungeon tiles: floor, rock walls, boulders, stairs, torches, the altar and the exit light. */
import { CAVE_FLOOR, CAVE_ROCK, FIRE, INK, IRON, RUNE, STONE, WOOD } from './palette';
import { Painter, bayer, ditherPick, glow, voronoi } from './painter';
import { SHADOW_ON, caveFloorBase, groundedTile } from './textures';
import { E, N, S, W, has, neighbourMask, oneOf, type TileDef, type TileId, type TileNeighborhood } from './types';
import { wallTop, type WallTopColors } from './walls';

const isCaveWall = oneOf('cave_wall', 'torch');
/** Below a wall, these mean "no visible face" (another wall, or nothing at all). */
const hidesWallFace = oneOf('cave_wall', 'torch', 'void');
const FLOOR_SHADOW = 1;

export const caveFloor: TileDef = {
  phased: true,
  variants: 4,
  mask: (nb) => (isCaveWall(nb.at(0, -1)) ? FLOOR_SHADOW : 0),
  paint(p, s) {
    caveFloorBase(p, s.wx, s.wy);
    if (has(s.mask, FLOOR_SHADOW)) {
      p.hline(0, 0, 16, CAVE_FLOOR[0]);
      p.hline(0, 1, 16, CAVE_FLOOR[0]);
      p.checker(0, 2, 16, 1, CAVE_FLOOR[0]);
    }
  },
};

// --- walls -------------------------------------------------------------------------------------

const WALL_FACE = 1 << 8;
const CAVE_TOP: WallTopColors = { base: '#1a1320', texture: '#231a2a', rimLit: CAVE_ROCK[4], rimShade: CAVE_ROCK[2] };

/** Rock wall: a craggy face where the wall meets floor to the south, a dark top elsewhere. */
export const caveWall: TileDef = {
  phased: true,
  mask: (nb) => neighbourMask(nb, isCaveWall) | (hidesWallFace(nb.at(0, 1)) ? 0 : WALL_FACE),
  paint(p, s) {
    if (has(s.mask, WALL_FACE)) rockFace(p, s.wx);
    else wallTop(p, s.mask, CAVE_TOP);
  },
};

/**
 * Craggy rock face built from Voronoi cells: every cell is a chunk of rock lit
 * on its top-left, cracks run where two cells meet, and the face darkens
 * towards its foot. Cells are world-periodic horizontally so walls are seamless.
 */
function rockFace(p: Painter, wx: number): void {
  const ramp = [CAVE_ROCK[1], CAVE_ROCK[2], CAVE_ROCK[3], CAVE_ROCK[4], CAVE_ROCK[5]];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = voronoi(wx + x + 0.5, (y + 0.5) * 1.2, 8, 7, 8, 1000, 63);
      let c: string;
      if (v.d2 - v.d1 < 1.1) c = CAVE_ROCK[1];
      else {
        const light = -(v.dx * 0.6 + v.dy * 0.8) / 4;
        const tone = ((v.cell >> 16) % 3) * 0.08;
        c = ditherPick(ramp, 0.5 + light * 0.45 + tone - (y / 15) * 0.3, x, y, 0.4);
      }
      p.px(x, y, c);
    }
  }
  p.hline(0, 0, 16, CAVE_ROCK[5]);
  p.hline(0, 15, 16, CAVE_ROCK[0]);
  p.checker(0, 14, 16, 1, CAVE_ROCK[0]);
}

/** Cave wall face with a wall-mounted torch; the flame flickers and lights the rock around it. */
export const torch: TileDef = {
  phased: true,
  frames: 4,
  frameMs: 250,
  paint(p, s) {
    rockFace(p, s.wx);
    glow(p, 8, 5, 8 + (s.frame % 2), FIRE[3], 0.28);
    // Bracket and handle.
    p.rect(6, 11, 4, 1, IRON[2]);
    p.px(7, 12, IRON[1]);
    p.rect(7, 6, 2, 6, WOOD[2]);
    p.vline(7, 6, 6, WOOD[4]);
    p.rect(6, 6, 4, 1, IRON[3]);
    flame(p, 8, 5, s.frame);
  },
};

/** Small torch flame (about 4x6) with its base at (cx, baseY). */
function flame(p: Painter, cx: number, baseY: number, frame: number): void {
  const shapes = [
    [[-1, 0, 3], [-1, -1, 3], [-1, -2, 2], [0, -3, 1], [0, -4, 1]],
    [[-2, 0, 4], [-1, -1, 3], [-1, -2, 3], [-1, -3, 1], [-1, -4, 1]],
    [[-1, 0, 3], [-2, -1, 4], [-1, -2, 2], [0, -3, 2], [1, -5, 1]],
    [[-2, 0, 4], [-1, -1, 3], [0, -2, 2], [0, -3, 1], [-1, -4, 1]],
  ];
  const rows = shapes[frame % shapes.length];
  rows.forEach(([dx, dy, w], i) => {
    const c = i < 2 ? FIRE[3] : i < 3 ? FIRE[2] : FIRE[1];
    p.rect(cx + dx, baseY + dy, w, 1, c);
  });
  p.px(cx, baseY, FIRE[5]);
  p.px(cx - (frame % 2), baseY - 1, FIRE[4]);
}

// --- floor features ---------------------------------------------------------------------------------

const onCaveFloor = { fallback: 'cave_floor' as const };

export const rock = groundedTile({
  ...onCaveFloor,
  variants: 2,
  paint(p, s, ground) {
    p.ellipse(9, 13.5, 6.5, 2, () => SHADOW_ON[ground]);
    const ramp = [CAVE_ROCK[2], CAVE_ROCK[3], CAVE_ROCK[4], CAVE_ROCK[5], CAVE_ROCK[6]];
    const [rx, ry] = s.variant === 0 ? [6, 5.5] : [5.5, 5];
    p.ellipse(8, 8.5, rx, ry, (x, y, nx, ny) => {
      const d = Math.hypot(nx, ny);
      const light = -(nx * 0.6 + ny * 0.8);
      if (d > 0.84) return light > 0.2 ? CAVE_ROCK[2] : CAVE_ROCK[0];
      return ditherPick(ramp, 0.35 + light * 0.5, x, y, 0.5);
    });
    // Facet crack.
    p.px(9, 7, CAVE_ROCK[1]);
    p.px(10, 8, CAVE_ROCK[1]);
    p.px(10, 9, CAVE_ROCK[1]);
    p.px(6, 5, CAVE_ROCK[6]);
  },
});

export const stairsDown = groundedTile({
  ...onCaveFloor,
  paint(p) {
    // Stone rim around a stairwell descending into darkness.
    p.rect(1, 1, 14, 15, CAVE_ROCK[4]);
    p.hline(1, 1, 14, CAVE_ROCK[5]);
    p.rect(3, 3, 10, 13, INK);
    const steps = [CAVE_ROCK[4], CAVE_ROCK[3], CAVE_ROCK[2], CAVE_ROCK[1]];
    steps.forEach((c, i) => {
      const y = 3 + i * 3;
      p.rect(3, y, 10, 2, c);
      p.hline(3, y + 2, 10, CAVE_ROCK[0]);
    });
    p.vline(3, 3, 13, CAVE_ROCK[0]);
    p.vline(12, 3, 13, CAVE_ROCK[1]);
  },
});

export const stairsUp = groundedTile({
  ...onCaveFloor,
  paint(p, _s, ground) {
    p.rect(2, 15, 12, 1, SHADOW_ON[ground]);
    // Side walls.
    for (const x of [1, 13]) {
      p.rect(x, 0, 2, 15, CAVE_ROCK[2]);
      p.vline(x, 0, 15, CAVE_ROCK[4]);
    }
    // Steps rising to the north: lit treads, dark risers, brighter towards the top.
    const treads = [CAVE_ROCK[6], CAVE_ROCK[5], CAVE_ROCK[4], CAVE_ROCK[3]];
    treads.forEach((c, i) => {
      const y = i * 4;
      p.rect(3, y, 10, 2, c);
      p.hline(3, y + 2, 10, CAVE_ROCK[2]);
      p.hline(3, y + 3, 10, CAVE_ROCK[1]);
    });
  },
});

/** Two-tier stone pedestal with softly glowing runes; the heartstone is drawn on top by the engine. */
export const altar = groundedTile({
  ...onCaveFloor,
  paint(p, _s, ground) {
    p.rect(2, 15, 14, 1, SHADOW_ON[ground]);
    // Lower tier.
    p.rect(0, 8, 16, 8, INK);
    p.rect(1, 9, 14, 3, STONE[3]);
    p.hline(1, 9, 14, STONE[4]);
    p.rect(1, 12, 14, 3, STONE[1]);
    p.hline(1, 12, 14, STONE[2]);
    // Upper tier.
    p.rect(3, 4, 10, 7, INK);
    p.rect(4, 5, 8, 2, STONE[4]);
    p.hline(4, 5, 8, STONE[5]);
    p.rect(4, 7, 8, 3, STONE[2]);
    // Runes.
    for (const x of [3, 6, 9, 12]) {
      p.px(x, 13, RUNE[2]);
      p.px(x, 12, RUNE[1]);
    }
    p.px(6, 8, RUNE[3]);
    p.px(9, 8, RUNE[3]);
    p.px(7, 9, RUNE[1]);
    p.px(8, 9, RUNE[1]);
  },
});

// --- cave mouth ----------------------------------------------------------------------------------------

const isInsideCave = oneOf('cave_floor', 'cave_wall', 'rock', 'torch', 'cave_water', 'altar', 'stairs_down', 'stairs_up');
const LIGHT_SIDES = [N, S, W, E] as const;

/** Which side daylight comes from: the first direct neighbour that is outside the cave (default north). */
function lightSide(nb: TileNeighborhood): number {
  const offsets: Record<number, [number, number]> = { [N]: [0, -1], [S]: [0, 1], [W]: [-1, 0], [E]: [1, 0] };
  for (const side of LIGHT_SIDES) {
    const [dx, dy] = offsets[side];
    if (!isInsideCave(nb.at(dx, dy))) return side;
  }
  return N;
}

const DAYLIGHT = '#fff2cc';

/**
 * Exit tile: cave floor washed with daylight streaming in from outside. The
 * light is an alpha overlay quantised into dithered steps so the floor texture
 * still shows through, with a few brighter diagonal rays.
 */
export const caveMouth: TileDef = {
  phased: true,
  mask: lightSide,
  paint(p, s) {
    caveFloorBase(p, s.wx, s.wy);
    const { ctx } = p;
    ctx.save();
    ctx.fillStyle = DAYLIGHT;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = s.mask === N ? y : s.mask === S ? 15 - y : s.mask === W ? x : 15 - x;
        const along = s.mask === N || s.mask === S ? s.wx + x : s.wy + y;
        const ray = (along + d) % 6 < 2 ? 0.15 : 0;
        const t = Math.max(0, 1 - d / 13) + ray;
        const level = Math.floor(t * 4 + bayer(x, y) - 0.5);
        if (level <= 0) continue;
        ctx.globalAlpha = Math.min(0.95, level * 0.24);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  },
};

export const voidTile: TileDef = {
  paint: (p) => p.rect(0, 0, 16, 16, '#000000'),
};

export const CAVE_TILES: Partial<Record<TileId, TileDef>> = {
  cave_floor: caveFloor, cave_wall: caveWall, rock, stairs_down: stairsDown, stairs_up: stairsUp, torch,
  altar, cave_mouth: caveMouth, void: voidTile,
};
