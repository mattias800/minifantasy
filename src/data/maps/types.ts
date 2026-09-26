import type { MusicId, SfxId } from '../../audio/Audio';
import type { Dir } from '../../engine/direction';
import type { Script } from '../../field/Script';
import type { GameState } from '../../game/GameState';
import type { BattleBackgroundId } from '../../gfx/backgrounds';
import type { FieldSpriteId } from '../../gfx/characters';
import type { EnemyArtId } from '../../gfx/enemies';
import type { TileId } from '../../gfx/tiles';
import type { EnemyId } from '../enemies';
import type { ItemId } from '../items';

export type MapId = 'overworld' | 'town' | 'inn' | 'shop' | 'elder_house' | 'cave1' | 'cave2';

export type ScriptFn = (s: Script) => Promise<void>;
export type Condition = (state: GameState) => boolean;

export interface NpcDef {
  id: string;
  sprite: FieldSpriteId;
  x: number;
  y: number;
  facing?: Dir;
  /** Wanders randomly within a couple of tiles of its start. */
  wander?: boolean;
  talk?: ScriptFn;
  visible?: Condition;
}

export interface WarpDef {
  x: number;
  y: number;
  to: MapId;
  tx: number;
  ty: number;
  facing: Dir;
  sfx?: SfxId;
  /** If present and false, the warp's `blocked` script runs instead. */
  when?: Condition;
  blocked?: ScriptFn;
}

export interface ChestDef {
  id: string;
  x: number;
  y: number;
  item?: ItemId;
  qty?: number;
  gold?: number;
}

export interface ObjectDef {
  id: string;
  x: number;
  y: number;
  kind: 'save_crystal' | 'heartstone' | 'monster';
  /** For monsters: which enemy art to show on the field. */
  art?: EnemyArtId;
  visible?: Condition;
  talk?: ScriptFn;
}

export interface TriggerDef {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  when?: Condition;
  run: ScriptFn;
}

export interface Formation {
  weight: number;
  enemies: EnemyId[];
}

export interface EncounterTable {
  /** Average steps between fights on a weight-1 tile. */
  steps: number;
  formations: Formation[];
  /** Restrict this table to a rectangle (inclusive). */
  region?: { x0: number; y0: number; x1: number; y1: number };
}

export interface MapDef {
  id: MapId;
  name: string;
  music: MusicId;
  rows: readonly string[];
  legend: Readonly<Record<string, TileId>>;
  encounters?: EncounterTable[];
  battleBackground?: BattleBackgroundId;
  npcs?: NpcDef[];
  warps?: WarpDef[];
  chests?: ChestDef[];
  objects?: ObjectDef[];
  triggers?: TriggerDef[];
  /** Interactions with plain tiles (wells, signs…). */
  inspect?: Array<{ x: number; y: number; run: ScriptFn }>;
  /** Where walking off the map edge leads. */
  exit?: { to: MapId; tx: number; ty: number; facing: Dir };
  /** The field menu's Save command works here. */
  canSave?: boolean;
  onEnter?: ScriptFn;
}
