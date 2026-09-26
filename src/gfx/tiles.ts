/**
 * Procedural tileset renderer.
 *
 * Every tile is painted in code (see ./tiles/*). Looks depend on the tile id,
 * a neighbour-derived autotile mask, a hashed per-cell variant, the world
 * texture phase and the animation frame; each distinct combination is painted
 * once into a 16x16 offscreen canvas and then blitted with drawImage.
 */
import { createCanvas, ctx2d } from './pixelart';
import { CAVE_TILES } from './tiles/cave';
import { INTERIOR_TILES } from './tiles/interior';
import { OVERWORLD_TILES } from './tiles/overworld';
import { Painter, hash2 } from './tiles/painter';
import { TOWN_TILES } from './tiles/town';
import type { TileDef, TileId, TileNeighborhood, TileState } from './tiles/types';
import { bridge, caveWater, water } from './tiles/water';

export type { TileId, TileNeighborhood } from './tiles/types';
export { getFieldObjectSprite, type FieldObjectId } from './tiles/objects';

export const TILE_SIZE = 16;

export const ALL_TILE_IDS: readonly TileId[] = [
  'grass', 'flowers', 'forest', 'hills', 'mountain', 'water', 'sand', 'path', 'bridge', 'town', 'cave_entrance',
  'cobble', 'tree', 'bush', 'fence', 'roof', 'wall', 'window', 'door', 'wall_sign_inn', 'wall_sign_item', 'well', 'lamp',
  'floor', 'int_wall', 'counter', 'bed', 'table', 'shelf', 'barrel', 'rug', 'hearth', 'mat', 'plant',
  'cave_floor', 'cave_wall', 'rock', 'stairs_down', 'stairs_up', 'torch', 'cave_water', 'altar', 'cave_mouth',
  'void',
];

const DEFS: Partial<Record<TileId, TileDef>> = {
  ...OVERWORLD_TILES,
  water,
  bridge,
  ...TOWN_TILES,
  ...INTERIOR_TILES,
  ...CAVE_TILES,
  cave_water: caveWater,
};

/** Resolved once at startup so a missing painter fails loudly instead of drawing nothing. */
const TILE_DEFS = Object.fromEntries(
  ALL_TILE_IDS.map((id) => {
    const def = DEFS[id];
    if (!def) throw new Error(`tiles: no painter registered for '${id}'`);
    return [id, def];
  }),
) as Record<TileId, TileDef>;

const ID_INDEX = new Map<TileId, number>(ALL_TILE_IDS.map((id, i) => [id, i]));

const cache = new Map<number, HTMLCanvasElement>();

/** Packs everything that affects a tile's pixels into one number (all parts are small integers). */
function cacheKey(idIndex: number, s: TileState): number {
  const phase = (s.wx >> 4) | ((s.wy >> 4) << 2);
  return (((idIndex * 65536 + s.mask) * 256 + s.variant) * 16 + s.frame) * 16 + phase;
}

function renderVariant(def: TileDef, s: TileState, key: number): HTMLCanvasElement {
  const canvas = createCanvas(TILE_SIZE, TILE_SIZE);
  def.paint(new Painter(ctx2d(canvas), hash2(key % 2147483647, 17)), s);
  return canvas;
}

/**
 * Draw one 16x16 tile with its top-left at (dx, dy). mapX/mapY let you vary
 * details deterministically per cell (hash them). timeMs drives animation.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  id: TileId,
  dx: number,
  dy: number,
  mapX: number,
  mapY: number,
  nb: TileNeighborhood,
  timeMs: number,
): void {
  const def = TILE_DEFS[id];
  const frames = def.frames ?? 1;
  const s: TileState = {
    mask: def.mask?.(nb) ?? 0,
    variant: (def.variants ?? 1) > 1 ? hash2(mapX, mapY, 1) % (def.variants ?? 1) : 0,
    frame: frames > 1 ? Math.floor(timeMs / (def.frameMs ?? 400)) % frames : 0,
    wx: def.phased ? (mapX & 3) * TILE_SIZE : 0,
    wy: def.phased ? (mapY & 3) * TILE_SIZE : 0,
  };
  const key = cacheKey(ID_INDEX.get(id) ?? 0, s);
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = renderVariant(def, s, key);
    cache.set(key, canvas);
  }
  ctx.drawImage(canvas, dx, dy);
}
