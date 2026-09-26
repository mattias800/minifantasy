import { PARTY_ORDER } from '../data/party';
import type { MapId } from '../data/maps';
import type { Dir } from '../engine/direction';
import { Inventory } from './Inventory';
import { PartyMember, type PartyMemberSave } from './PartyMember';
import type { ItemId } from '../data/items';

export interface Location {
  map: MapId;
  x: number;
  y: number;
  facing: Dir;
}

export interface SaveData {
  version: 1;
  party: PartyMemberSave[];
  inventory: Array<[ItemId, number]>;
  gold: number;
  flags: string[];
  location: Location;
  playTimeMs: number;
  savedAt: number;
}

/**
 * Story flags, e.g. 'intro_done', 'seal_broken', 'troll_defeated', 'wyrm_defeated'.
 * Opened chests are stored as `chest:<map>:<id>`.
 */
export type Flag = string;

/** Everything that persists between scenes and in save files. */
export class GameState {
  party: PartyMember[] = PARTY_ORDER.map((id) => new PartyMember(id));
  inventory = new Inventory();
  gold = 0;
  flags = new Set<Flag>();
  location: Location = { map: 'elder_house', x: 6, y: 7, facing: 'up' };
  playTimeMs = 0;

  static newGame(): GameState {
    const s = new GameState();
    s.gold = 150;
    s.inventory.add('potion', 4);
    s.inventory.add('antidote', 1);
    return s;
  }

  hasFlag(flag: Flag): boolean {
    return this.flags.has(flag);
  }

  setFlag(flag: Flag): void {
    this.flags.add(flag);
  }

  get livingParty(): PartyMember[] {
    return this.party.filter((m) => m.alive);
  }

  get averageLevel(): number {
    return this.party.reduce((s, m) => s + m.level, 0) / this.party.length;
  }

  toSave(): SaveData {
    return {
      version: 1,
      party: this.party.map((m) => m.toSave()),
      inventory: this.inventory.toSave(),
      gold: this.gold,
      flags: [...this.flags],
      location: { ...this.location },
      playTimeMs: Math.round(this.playTimeMs),
      savedAt: Date.now(),
    };
  }

  static fromSave(data: SaveData): GameState {
    const s = new GameState();
    s.party = data.party.map((p) => PartyMember.fromSave(p));
    s.inventory = Inventory.fromSave(data.inventory);
    s.gold = data.gold;
    s.flags = new Set(data.flags);
    s.location = { ...data.location };
    s.playTimeMs = data.playTimeMs;
    return s;
  }
}
