import type { TileId } from '../gfx/tiles';

export interface TileProps {
  walkable: boolean;
  /** Random-encounter weight per step (0 = safe). Only applies on maps with encounters. */
  encounter: number;
  /** Talk "across" this tile (shop counters). */
  counter?: boolean;
}

const WALK: TileProps = { walkable: true, encounter: 0 };
const BLOCK: TileProps = { walkable: false, encounter: 0 };
const FIELD: TileProps = { walkable: true, encounter: 1 };

export const TILE_PROPS: Readonly<Record<TileId, TileProps>> = {
  // overworld
  grass: FIELD,
  flowers: FIELD,
  forest: { walkable: true, encounter: 1.4 },
  hills: { walkable: true, encounter: 1.2 },
  mountain: BLOCK,
  water: BLOCK,
  sand: FIELD,
  path: { walkable: true, encounter: 0.5 },
  bridge: WALK,
  town: WALK,
  cave_entrance: WALK,
  // town
  cobble: WALK,
  tree: BLOCK,
  bush: BLOCK,
  fence: BLOCK,
  roof: BLOCK,
  wall: BLOCK,
  window: BLOCK,
  door: WALK,
  wall_sign_inn: BLOCK,
  wall_sign_item: BLOCK,
  well: BLOCK,
  lamp: BLOCK,
  // interiors
  floor: WALK,
  int_wall: BLOCK,
  counter: { walkable: false, encounter: 0, counter: true },
  bed: BLOCK,
  table: BLOCK,
  shelf: BLOCK,
  barrel: BLOCK,
  rug: WALK,
  hearth: BLOCK,
  mat: WALK,
  plant: BLOCK,
  // cave
  cave_floor: FIELD,
  cave_wall: BLOCK,
  rock: BLOCK,
  stairs_down: WALK,
  stairs_up: WALK,
  torch: BLOCK,
  cave_water: BLOCK,
  altar: BLOCK,
  cave_mouth: WALK,
  void: BLOCK,
};
