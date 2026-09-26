/** Shared types for the tileset: tile ids, neighbourhood access and tile definitions. */
import type { Painter } from './painter';

export type TileId =
  // overworld
  | 'grass' | 'flowers' | 'forest' | 'hills' | 'mountain' | 'water' | 'sand' | 'path' | 'bridge'
  | 'town' | 'cave_entrance'
  // town exterior
  | 'cobble' | 'tree' | 'bush' | 'fence' | 'roof' | 'wall' | 'window' | 'door'
  | 'wall_sign_inn' | 'wall_sign_item' | 'well' | 'lamp'
  // interiors
  | 'floor' | 'int_wall' | 'counter' | 'bed' | 'table' | 'shelf' | 'barrel' | 'rug' | 'hearth' | 'mat' | 'plant'
  // cave / dungeon
  | 'cave_floor' | 'cave_wall' | 'rock' | 'stairs_down' | 'stairs_up' | 'torch' | 'cave_water' | 'altar' | 'cave_mouth'
  // misc
  | 'void';

/** Returns the tile id at an offset from the tile being drawn (out-of-bounds returns the nearest edge tile). */
export interface TileNeighborhood {
  at(dx: number, dy: number): TileId;
}

/** Everything a painter needs to render one cached tile variant. */
export interface TileState {
  /** Tile-specific neighbour/context bits returned by `TileDef.mask`. */
  mask: number;
  /** Per-cell variant in [0, TileDef.variants), picked from a hash of the map position. */
  variant: number;
  /** Animation frame in [0, TileDef.frames). */
  frame: number;
  /**
   * Pixel offset of this cell inside a 64x64 world-aligned texture period
   * (only non-zero for `phased` tiles). Sampling textures at (wx + x, wy + y)
   * makes large areas seamless instead of repeating every 16 pixels.
   */
  wx: number;
  wy: number;
}

export interface TileDef {
  /** Context bits (< 65536) that change the look, usually from neighbours. Defaults to 0. */
  mask?(nb: TileNeighborhood): number;
  /** Number of hashed per-cell variants. Defaults to 1. */
  variants?: number;
  /** Animation frames and duration of each frame. Defaults to a static tile. */
  frames?: number;
  frameMs?: number;
  /** Cache per 4x4 world phase so textures can flow across tile borders. */
  phased?: boolean;
  paint(p: Painter, s: TileState): void;
}

// --- neighbour bitmasks ---------------------------------------------------------

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export const NE = 16;
export const SE = 32;
export const SW = 64;
export const NW = 128;

const NEIGHBOUR_OFFSETS: readonly (readonly [number, number, number])[] = [
  [0, -1, N], [1, 0, E], [0, 1, S], [-1, 0, W],
  [1, -1, NE], [1, 1, SE], [-1, 1, SW], [-1, -1, NW],
];

/** 8-bit mask with a bit set for every neighbour that satisfies `match`. */
export function neighbourMask(nb: TileNeighborhood, match: (id: TileId) => boolean): number {
  let mask = 0;
  for (const [dx, dy, bit] of NEIGHBOUR_OFFSETS) if (match(nb.at(dx, dy))) mask |= bit;
  return mask;
}

/** The mask bit for the neighbour at offset (dx, dy), or 0 for the centre / anything further away. */
export function neighbourBit(dx: number, dy: number): number {
  for (const [ox, oy, bit] of NEIGHBOUR_OFFSETS) if (ox === dx && oy === dy) return bit;
  return 0;
}

export const has = (mask: number, bit: number): boolean => (mask & bit) !== 0;

/** Convenience matcher for a set of ids. */
export function oneOf(...ids: TileId[]): (id: TileId) => boolean {
  const set = new Set<TileId>(ids);
  return (id) => set.has(id);
}
