/**
 * Animated water (overworld sea and underground pools) with autotiled shores,
 * plus the bridge tile which sits on top of either kind of water.
 */
import { CAVE_WATER, WATER, WOOD, type Ramp } from './palette';
import { Painter, ditherPick, hash2, periodicNoise } from './painter';
import {
  E, N, NE, NW, S, SE, SW, W, has, neighbourMask, type TileDef, type TileId, type TileState,
} from './types';

interface WaterStyle {
  ramp: Ramp;
  /** Surf foam on the shoreline (sea) versus a calm lighter rim (cave pools). */
  surf: boolean;
  seed: number;
}

const SEA: WaterStyle = { ramp: WATER, surf: true, seed: 101 };
const POOL: WaterStyle = { ramp: CAVE_WATER, surf: false, seed: 202 };

const WATER_FRAMES = 4;
const WATER_FRAME_MS = 420;

const isWaterish = (id: TileId) => id === 'water' || id === 'cave_water' || id === 'bridge';

/**
 * Distance (in px) from a pixel centre to the nearest land edge implied by
 * `land` (8-neighbour bits). Outer corners are rounded, inner corners get a
 * quarter circle so coastlines never look like a staircase of squares.
 */
function shoreDistance(x: number, y: number, land: number): number {
  const cx = x + 0.5;
  const cy = y + 0.5;
  let d = Infinity;
  if (has(land, N)) d = Math.min(d, cy);
  if (has(land, S)) d = Math.min(d, 16 - cy);
  if (has(land, W)) d = Math.min(d, cx);
  if (has(land, E)) d = Math.min(d, 16 - cx);
  const R = 4;
  const corner = (diag: number, a: number, b: number, kx: number, ky: number) => {
    const dx = Math.abs(cx - kx);
    const dy = Math.abs(cy - ky);
    if (has(land, a) && has(land, b)) {
      if (dx < R && dy < R) d = Math.min(d, R - Math.hypot(R - dx, R - dy));
    } else if (has(land, diag)) {
      d = Math.min(d, Math.hypot(dx, dy) - 1);
    }
  };
  corner(NW, N, W, 0, 0);
  corner(NE, N, E, 16, 0);
  corner(SW, S, W, 0, 16);
  corner(SE, S, E, 16, 16);
  return d;
}

/** Open-water colour: slow dark/mid patches plus drifting wave glints. */
function deepColor(style: WaterStyle, s: TileState, x: number, y: number): string {
  const { ramp } = style;
  const wx = s.wx + x;
  const wy = s.wy + y;
  const n = periodicNoise(wx + s.frame * 2, wy, 16, 64, style.seed);
  let c = ditherPick([ramp[1], ramp[2], ramp[2], ramp[2]], n, x, y, 0.3);
  // One glint per 8x8 world cell, twinkling on its own phase.
  const cell = hash2(wx >> 3, wy >> 3, style.seed);
  const step = (s.frame + (cell & 3)) % WATER_FRAMES;
  const gx = (cell >> 2) % 5 + (step === 1 ? 1 : 0);
  const gy = 1 + ((cell >> 5) % 6);
  const len = step === 0 ? 2 : step === 1 ? 3 : 0;
  const lx = (wx & 7) - gx;
  if ((wy & 7) === gy && lx >= 0 && lx < len) c = step === 1 ? ramp[4] : ramp[3];
  if ((wy & 7) === gy + 1 && lx >= 1 && lx < len - 1) c = ramp[1];
  return c;
}

/** Paints a full 16x16 water surface for `land` neighbour bits. */
function paintWaterSurface(p: Painter, s: TileState, style: WaterStyle, land: number): void {
  const { ramp } = style;
  // The surf "breathes" in and out with the animation.
  const swell = [0, 0.5, 1, 0.5][s.frame % 4];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = land ? shoreDistance(x, y, land) : Infinity;
      let c: string;
      if (style.surf) {
        if (d < 0.6 + swell * 0.6) c = ramp[6];
        else if (d < 1.6 + swell) c = ((x + y + s.frame) & 3) === 0 ? ramp[6] : ramp[5];
        else if (d < 3.5) c = ramp[4];
        else if (d < 5) c = ditherPick([ramp[3], ramp[4]], (5 - d) / 1.5, x, y, 0.6);
        else if (d < 6.5) c = ditherPick([ramp[2], ramp[3]], (6.5 - d) / 1.5, x, y, 0.6);
        else c = deepColor(style, s, x, y);
      } else {
        if (d < 0.8) c = ramp[1]; // wet dark lip where rock meets water
        else if (d < 1.8 + swell * 0.5) c = ramp[5];
        else if (d < 3.2) c = ramp[4];
        else if (d < 5) c = ditherPick([ramp[3], ramp[4]], (5 - d) / 1.8, x, y, 0.6);
        else c = deepColor(style, s, x, y);
      }
      p.px(x, y, c);
    }
  }
}

function waterDef(style: WaterStyle): TileDef {
  return {
    phased: true,
    frames: WATER_FRAMES,
    frameMs: WATER_FRAME_MS,
    // 'void' (beyond the map) counts as open water so the sea runs off the edge cleanly.
    mask: (nb) => neighbourMask(nb, (id) => !isWaterish(id) && id !== 'void'),
    paint: (p, s) => paintWaterSurface(p, s, style, s.mask),
  };
}

export const water = waterDef(SEA);
export const caveWater = waterDef(POOL);

// --- bridge -------------------------------------------------------------------------------

const BRIDGE_EW = 1 << 8;
const BRIDGE_CAVE = 1 << 9;

/**
 * Wooden bridge. Orientation is automatic: water to the east and west means a
 * north-south bridge (rails left/right), otherwise it spans east-west.
 */
export const bridge: TileDef = {
  phased: true,
  frames: WATER_FRAMES,
  frameMs: WATER_FRAME_MS,
  mask(nb) {
    const wet = (dx: number, dy: number) => {
      const id = nb.at(dx, dy);
      return id === 'water' || id === 'cave_water';
    };
    const alongNS = nb.at(0, -1) === 'bridge' || nb.at(0, 1) === 'bridge';
    const ew = (wet(0, -1) && wet(0, 1)) || (!(wet(-1, 0) && wet(1, 0)) && !alongNS);
    const cave = neighbourMask(nb, (id) => id === 'cave_water') !== 0;
    const land = neighbourMask(nb, (id) => !isWaterish(id));
    return land | (ew ? BRIDGE_EW : 0) | (cave ? BRIDGE_CAVE : 0);
  },
  paint(p, s) {
    paintWaterSurface(p, s, has(s.mask, BRIDGE_CAVE) ? POOL : SEA, s.mask & 0xff);
    if (has(s.mask, BRIDGE_EW)) paintBridgeEW(p);
    else paintBridgeNS(p);
  },
};

/** Deck boards run across the direction of travel; rails sit on both long sides. */
function paintBridgeNS(p: Painter): void {
  p.vline(14, 0, 16, WATER[0]); // shadow cast on the water
  for (let y = 0; y < 16; y += 4) plank(p, 2, y, 12, 4, true);
  for (const x of [1, 13]) {
    p.rect(x, 0, 2, 16, WOOD[2]);
    p.vline(x, 0, 16, WOOD[3]);
    for (const y of [2, 10]) {
      p.rect(x, y, 2, 3, WOOD[4]);
      p.hline(x, y + 3, 2, WOOD[0]);
    }
  }
  p.vline(0, 0, 16, WOOD[0]);
  p.vline(15, 0, 16, WOOD[0]);
}

function paintBridgeEW(p: Painter): void {
  p.hline(0, 15, 16, WATER[0]);
  for (let x = 0; x < 16; x += 4) plank(p, x, 2, 4, 11, false);
  for (const y of [1, 12]) {
    p.rect(0, y, 16, 2, WOOD[2]);
    p.hline(0, y, 16, WOOD[3]);
    for (const x of [2, 10]) {
      p.rect(x, y - 1, 3, 3, WOOD[4]);
      p.vline(x + 3, y - 1, 3, WOOD[0]);
    }
  }
  p.hline(0, 14, 16, WOOD[0]);
}

/** One deck board: light leading edge, darker gap on the trailing edge, two nails. */
function plank(p: Painter, x: number, y: number, w: number, h: number, horizontal: boolean): void {
  p.rect(x, y, w, h, WOOD[3]);
  if (horizontal) {
    p.hline(x, y, w, WOOD[4]);
    p.hline(x, y + h - 1, w, WOOD[1]);
    p.px(x + 1, y + 1, WOOD[1]);
    p.px(x + w - 2, y + 1, WOOD[1]);
  } else {
    p.vline(x, y, h, WOOD[4]);
    p.vline(x + w - 1, y, h, WOOD[1]);
    p.px(x + 1, y + 1, WOOD[1]);
    p.px(x + 1, y + h - 2, WOOD[1]);
  }
}
