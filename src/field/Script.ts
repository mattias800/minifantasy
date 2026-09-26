import type { MusicId, SfxId } from '../audio/Audio';
import type { EnemyId } from '../data/enemies';
import type { ItemId } from '../data/items';
import type { MapId } from '../data/maps/types';
import type { ShopId } from '../data/shops';
import type { Dir } from '../engine/direction';
import type { GameState } from '../game/GameState';
import type { BattleBackgroundId } from '../gfx/backgrounds';

export interface BattleOptions {
  background?: BattleBackgroundId;
  /** Boss music, no escape. */
  boss?: boolean;
}

/**
 * The API available to map scripts (NPC dialogue, cutscenes, events).
 * Every method that shows something returns a promise that resolves when it's done,
 * so scripts read top-to-bottom like a screenplay.
 */
export interface Script {
  readonly state: GameState;

  say(text: string, speaker?: string): Promise<void>;
  /** Shows a message with choices; resolves with the chosen index. */
  ask(text: string, choices: string[], speaker?: string): Promise<number>;
  wait(ms: number): Promise<void>;

  /** Adds an item and announces it ("Received Potion!"). `verb` replaces "Received". */
  giveItem(id: ItemId, qty?: number, verb?: string): Promise<void>;
  giveGold(amount: number, verb?: string): Promise<void>;
  healParty(): void;

  inn(price: number): Promise<void>;
  shop(id: ShopId): Promise<void>;
  save(): Promise<void>;
  /** Resolves true on victory. On defeat the game-over screen takes over and this never resolves. */
  battle(enemies: EnemyId[], opts?: BattleOptions): Promise<boolean>;

  /** Moves an actor ('player' for the party leader) along a path, ignoring collisions. */
  walk(actorId: string, path: Dir[]): Promise<void>;
  face(actorId: string, dir: Dir): void;
  hideNpc(id: string): void;
  showNpc(id: string): void;
  warp(map: MapId, x: number, y: number, facing: Dir): Promise<void>;

  playMusic(id: MusicId | null): void;
  sfx(id: SfxId): void;
  fadeOut(ms?: number): Promise<void>;
  fadeIn(ms?: number): Promise<void>;
  flash(color?: string, ms?: number): Promise<void>;
  shake(strength?: number, ms?: number): void;

  /** Rolls the credits. */
  ending(): Promise<void>;
}
