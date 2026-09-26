import type { ItemId } from './items';
import type { SpellId } from './spells';
import type { PartyMemberId, Stats } from './types';

export interface PartyClassDef {
  id: PartyMemberId;
  name: string;
  job: string;
  /** Stats at level 1. */
  base: Stats;
  /** Stat gain per level (fractional; floored when computed). */
  growth: Stats;
  /** Label of the class's ability command in battle. */
  commandName: string;
  /** Abilities and the level they're learned at. */
  learnset: ReadonlyArray<{ spell: SpellId; level: number }>;
  startingEquipment: { weapon: ItemId; armor: ItemId };
}

export const PARTY_CLASSES: Readonly<Record<PartyMemberId, PartyClassDef>> = {
  hero: {
    id: 'hero',
    name: 'Kael',
    job: 'Knight',
    base: { hp: 52, mp: 8, str: 12, mag: 3, def: 7, mdef: 3, spd: 8 },
    growth: { hp: 15, mp: 2, str: 2.3, mag: 0.6, def: 1.4, mdef: 0.8, spd: 0.6 },
    commandName: 'Skill',
    learnset: [
      { spell: 'powerstrike', level: 1 },
      { spell: 'whirlslash', level: 4 },
      { spell: 'dawnblade', level: 7 },
    ],
    startingEquipment: { weapon: 'bronze_sword', armor: 'leather' },
  },
  cleric: {
    id: 'cleric',
    name: 'Lyra',
    job: 'Cleric',
    base: { hp: 38, mp: 14, str: 6, mag: 10, def: 5, mdef: 7, spd: 9 },
    growth: { hp: 10, mp: 3, str: 1, mag: 2, def: 0.9, mdef: 1.5, spd: 0.7 },
    commandName: 'Magic',
    learnset: [
      { spell: 'heal', level: 1 },
      { spell: 'purify', level: 2 },
      { spell: 'barrier', level: 3 },
      { spell: 'mend', level: 5 },
      { spell: 'rekindle', level: 6 },
      { spell: 'radiance', level: 8 },
    ],
    startingEquipment: { weapon: 'oak_staff', armor: 'cloth_robe' },
  },
  mage: {
    id: 'mage',
    name: 'Orrin',
    job: 'Arcanist',
    base: { hp: 32, mp: 16, str: 4, mag: 13, def: 4, mdef: 8, spd: 10 },
    growth: { hp: 8.5, mp: 3.4, str: 0.7, mag: 2.6, def: 0.8, mdef: 1.6, spd: 0.8 },
    commandName: 'Magic',
    learnset: [
      { spell: 'flame', level: 1 },
      { spell: 'frost', level: 1 },
      { spell: 'spark', level: 3 },
      { spell: 'firestorm', level: 5 },
      { spell: 'starfall', level: 8 },
    ],
    startingEquipment: { weapon: 'ash_rod', armor: 'cloth_robe' },
  },
};

export const PARTY_ORDER: readonly PartyMemberId[] = ['hero', 'cleric', 'mage'];

export const MAX_LEVEL = 30;

/** Total experience needed to reach `level`. */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return Math.round(14 * n ** 2.1 + 6 * n);
}
