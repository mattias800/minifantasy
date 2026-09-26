/** Field object sprites drawn by the engine on top of the map: chests, the save crystal and the heartstone. */
import { createCanvas, ctx2d, outline, spriteFromRows } from '../pixelart';
import { CHEST_WOOD, CRYSTAL, GOLD, HEART, HEART_DIM, INK, RUNE, STONE, type Ramp } from './palette';
import { Painter, glow } from './painter';

export type FieldObjectId = 'chest_closed' | 'chest_open' | 'save_crystal' | 'heartstone_dim' | 'heartstone_bright';

interface ObjectDef {
  width: number;
  height: number;
  frames: number;
  frameMs: number;
  paint(p: Painter, frame: number): void;
}

const SHADOW = 'rgba(8, 4, 16, 0.4)';

// --- chests ---------------------------------------------------------------------------------------

const CHEST_PALETTE = {
  o: INK, H: CHEST_WOOD[4], h: CHEST_WOOD[3], w: CHEST_WOOD[2], b: CHEST_WOOD[2], B: CHEST_WOOD[1], d: CHEST_WOOD[0], e: CHEST_WOOD[1],
  g: GOLD[3], G: GOLD[2], y: GOLD[1], L: GOLD[4], k: '#1a0e08', s: SHADOW,
};

/** Shared lower half: front panel with gold straps and lock, outline and ground shadow. */
const CHEST_FRONT = [
  '.obgGbbLLbbgGBo.',
  '.obgGbbLkbbgGBo.',
  '.obgGbbbbbbgGBo.',
  '.obgGbbbbbbgGBo.',
  '.oBGGBBBBBBGGBo.',
  '.oooooooooooooo.',
  '..ssssssssssss..',
  '................',
];

const CHEST_CLOSED_ROWS = [
  '................',
  '................',
  '................',
  '..oooooooooooo..',
  '.ohgGhhhhhhgGho.',
  '.owgGwwwwwwgGdo.',
  '.owgGwwwwwwgGdo.',
  '.oyyyyyLLyyyyyo.',
  ...CHEST_FRONT,
];

const CHEST_OPEN_ROWS = [
  '..oooooooooooo..',
  '.oGddddddddddGo.',
  '.oGddddddddddGo.',
  '.oGeeeeeeeeeeGo.',
  '.oooooooooooooo.',
  '.ohhhhhhhhhhhho.',
  '.okkkkkkkkkkkko.',
  '.oHHHHHHHHHHHHo.',
  ...CHEST_FRONT,
];

function spriteDef(rows: readonly string[]): ObjectDef {
  let sprite: HTMLCanvasElement | null = null;
  return {
    width: 16, height: 16, frames: 1, frameMs: 1000,
    paint(p) {
      sprite ??= spriteFromRows(rows, CHEST_PALETTE);
      p.stamp(sprite, 0, 0);
    },
  };
}

const chestClosed = spriteDef(CHEST_CLOSED_ROWS);
const chestOpen = spriteDef(CHEST_OPEN_ROWS);

// --- save crystal --------------------------------------------------------------------------------------

/** Row widths of a faceted octahedral crystal, top to bottom. */
const CRYSTAL_ROWS = [1, 3, 5, 5, 7, 7, 9, 7, 7, 5, 5, 3, 3, 1];

/**
 * Draws a faceted gem centred on column `cx` with its top at `top`, using a
 * darkest->lightest ramp: lit upper-left facet, shaded lower-right facet.
 */
function gem(p: Painter, rows: readonly number[], cx: number, top: number, ramp: Ramp, widest: number): void {
  rows.forEach((w, i) => {
    const y = top + i;
    const x0 = cx - (w - 1) / 2;
    for (let k = 0; k < w; k++) {
      const x = x0 + k;
      const left = x < cx;
      const upper = i <= widest;
      let c = upper ? (left ? ramp[4] : ramp[3]) : (left ? ramp[2] : ramp[1]);
      if (x === cx) c = upper ? ramp[5] : ramp[3];
      p.px(x, y, c);
    }
  });
}

function sparkle(p: Painter, x: number, y: number, big: boolean, color: string): void {
  p.px(x, y, color);
  if (!big) return;
  p.px(x - 1, y, color);
  p.px(x + 1, y, color);
  p.px(x, y - 1, color);
  p.px(x, y + 1, color);
}

const SAVE_FRAMES = 8;

const saveCrystal: ObjectDef = {
  width: 16, height: 24, frames: SAVE_FRAMES, frameMs: 130,
  paint(p, frame) {
    const phase = (frame / SAVE_FRAMES) * Math.PI * 2;
    const bob = Math.round(Math.sin(phase) * 1.5);
    // Ground shadow shrinks as the crystal rises.
    const sw = bob < 0 ? 4 : 5;
    p.rect(8 - sw, 22, sw * 2, 1, SHADOW);
    p.rect(9 - sw, 23, sw * 2 - 2, 1, SHADOW);
    glow(p, 7.5, 9 + bob, 8, CRYSTAL[3], 0.22);
    // Gem on its own layer so it can be outlined.
    const layer = createCanvas(16, 24);
    const lp = new Painter(ctx2d(layer), 0);
    gem(lp, CRYSTAL_ROWS, 7, 3 + bob, CRYSTAL, 6);
    p.stamp(outline(layer, CRYSTAL[0]), 0, 0);
    // Orbiting sparkles.
    const sx = Math.round(7 + Math.cos(phase) * 6);
    const sy = Math.round(10 + bob + Math.sin(phase) * 2);
    sparkle(p, sx, sy, frame % 2 === 0, CRYSTAL[5]);
    sparkle(p, 14 - sx, 18 - sy + 2 * bob, frame % 4 === 1, CRYSTAL[4]);
  },
};

// --- heartstone -----------------------------------------------------------------------------------------

const HEART_FRAMES = 8;

/** Tall hexagonal crystal: pointed top, three visible faces, set into a small rune dais. */
/**
 * A vertical hexagonal crystal column with a pointed tip: lit left face, bright
 * central face with a specular stripe, shadowed right face.
 */
function prism(p: Painter, cx: number, top: number, bottom: number, hw: number, ramp: Ramp): void {
  const third = Math.max(1, Math.round((hw * 2) / 3));
  for (let y = top; y < bottom; y++) {
    const w = Math.min(hw, Math.floor((y - top) * 0.9) + (hw > 2 ? 0 : 1));
    for (let x = cx - w; x < cx + w; x++) {
      const face = x < cx - hw + third ? 0 : x < cx + hw - third ? 1 : 2;
      let c = face === 0 ? ramp[4] : face === 1 ? ramp[3] : ramp[1];
      if (y - top < hw) c = face === 2 ? ramp[2] : ramp[5]; // lit tip facets
      if (face === 1 && x === cx - hw + third) c = ramp[5]; // specular stripe
      p.px(x, y, c);
    }
  }
}

function heartstone(p: Painter, ramp: Ramp, bright: boolean, frame: number): void {
  // Dais.
  p.rect(1, 30, 15, 2, SHADOW);
  p.rect(2, 25, 12, 6, INK);
  p.rect(3, 26, 10, 2, STONE[4]);
  p.hline(3, 26, 10, STONE[5]);
  p.rect(3, 28, 10, 2, STONE[2]);
  for (const x of [4, 7, 10]) p.px(x, 29, bright ? RUNE[3] : RUNE[0]);

  const layer = createCanvas(16, 32);
  const lp = new Painter(ctx2d(layer), 0);
  prism(lp, 8, 2, 27, 5, ramp);
  // Two small shards in front of the main crystal's foot, split from it by a dark seam.
  prism(lp, 3, 19, 27, 2, ramp);
  lp.vline(4, 20, 7, ramp[0]);
  prism(lp, 13, 21, 27, 2, ramp);
  lp.vline(11, 22, 5, ramp[0]);
  if (bright) {
    // Pulsing inner core.
    const pulse = Math.sin((frame / HEART_FRAMES) * Math.PI * 2);
    const coreTop = 10 + Math.round(pulse);
    lp.rect(7, coreTop, 2, 10, ramp[5]);
    lp.rect(7, coreTop + 3, 1, 4, ramp[6]);
  } else {
    // Cracks.
    const crack: [number, number][] = [[9, 7], [8, 8], [8, 9], [9, 10], [9, 11], [8, 12], [7, 13], [7, 14], [6, 15], [10, 17], [11, 18], [10, 19]];
    for (const [x, y] of crack) lp.px(x, y, ramp[0]);
    lp.px(5, 20, ramp[0]);
    lp.px(4, 21, ramp[0]);
  }
  const outlined = outline(layer, ramp[0]);
  if (bright) {
    const pulse = 0.32 + 0.12 * Math.sin((frame / HEART_FRAMES) * Math.PI * 2);
    glow(p, 8, 15, 11, ramp[4], pulse);
  }
  p.stamp(outlined, 0, 0);
  if (bright) {
    // Rising motes.
    for (let k = 0; k < 3; k++) {
      const t = ((frame + k * 3) % HEART_FRAMES) / HEART_FRAMES;
      const x = [2, 13, 11][k];
      const y = Math.round(24 - t * 22);
      sparkle(p, x, y, (frame + k) % 3 === 0, t < 0.5 ? ramp[6] : ramp[5]);
    }
  }
}


const heartstoneDim: ObjectDef = {
  width: 16, height: 32, frames: 1, frameMs: 1000,
  paint: (p) => heartstone(p, HEART_DIM, false, 0),
};

const heartstoneBright: ObjectDef = {
  width: 16, height: 32, frames: HEART_FRAMES, frameMs: 140,
  paint: (p, frame) => heartstone(p, HEART, true, frame),
};

// --- public API -----------------------------------------------------------------------------------------

const OBJECTS: Record<FieldObjectId, ObjectDef> = {
  chest_closed: chestClosed,
  chest_open: chestOpen,
  save_crystal: saveCrystal,
  heartstone_dim: heartstoneDim,
  heartstone_bright: heartstoneBright,
};

const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Field object sprites. chest_*: 16x16. save_crystal: 16x24 animated floating
 * crystal with sparkle (bottom-aligned). heartstone_*: 16x32 large sacred
 * crystal on a small base (dim = grey/dull purple, cracked-looking; bright =
 * radiant, glowing animated). Returns the canvas for the current time.
 */
export function getFieldObjectSprite(id: FieldObjectId, timeMs: number): HTMLCanvasElement {
  const def = OBJECTS[id];
  const frame = Math.floor(timeMs / def.frameMs) % def.frames;
  const key = `${id}:${frame}`;
  let canvas = spriteCache.get(key);
  if (!canvas) {
    canvas = createCanvas(def.width, def.height);
    def.paint(new Painter(ctx2d(canvas), 1), frame);
    spriteCache.set(key, canvas);
  }
  return canvas;
}
