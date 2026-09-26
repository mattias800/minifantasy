import { describe, expect, it } from 'vitest';
import type { EnemyId } from '../data/enemies';
import type { ItemId } from '../data/items';
import { xpForLevel } from '../data/party';
import { PartyMember } from '../game/PartyMember';
import { seededRandom } from '../gfx/pixelart';
import { simulateBattle } from './simulate';

interface Loadout {
  level: number;
  hero?: [ItemId, ItemId];
  cleric?: [ItemId, ItemId];
  mage?: [ItemId, ItemId];
}

function makeParty(l: Loadout): PartyMember[] {
  return (['hero', 'cleric', 'mage'] as const).map((id) => {
    const m = new PartyMember(id);
    m.gainXp(xpForLevel(l.level));
    const gear = l[id];
    if (gear) {
      m.equipment.weapon = gear[0];
      m.equipment.armor = gear[1];
    }
    m.restoreAll();
    return m;
  });
}

/** Win rate over many seeded runs; each run starts from full HP/MP. */
function winRate(l: Loadout, enemies: EnemyId[], runs = 200, potions = 0, ethers = 0): number {
  const rng = seededRandom(42);
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    if (simulateBattle(makeParty(l), enemies, rng, { potions, ethers }).won) wins++;
  }
  return wins / runs;
}

const EARLY: Loadout = { level: 1 };
const NORTH: Loadout = { level: 4, hero: ['iron_sword', 'leather'], cleric: ['oak_staff', 'cloth_robe'], mage: ['ember_rod', 'cloth_robe'] };
const GROTTO: Loadout = { level: 6, hero: ['iron_sword', 'chainmail'], cleric: ['silver_staff', 'silk_robe'], mage: ['moon_rod', 'silk_robe'] };
const TROLL: Loadout = { ...GROTTO, level: 7 };
const FINAL: Loadout = { level: 10, hero: ['runeblade', 'chainmail'], cleric: ['silver_staff', 'sage_robe'], mage: ['moon_rod', 'silk_robe'] };

describe('balance', () => {
  it('early fields are safe at level 1', () => {
    expect(winRate(EARLY, ['jelly', 'jelly'])).toBeGreaterThan(0.97);
    expect(winRate(EARLY, ['goblin', 'jelly'])).toBeGreaterThan(0.9);
  });

  it('north fields are fair at level 4', () => {
    expect(winRate(NORTH, ['wolf', 'hornhare'])).toBeGreaterThan(0.9);
    expect(winRate(NORTH, ['hornhare', 'hornhare', 'hornhare'])).toBeGreaterThan(0.9);
  });

  it('grotto monsters are beatable at level 6', () => {
    expect(winRate(GROTTO, ['boneknight', 'wisp'])).toBeGreaterThan(0.85);
    expect(winRate(GROTTO, ['golem'])).toBeGreaterThan(0.85);
  });

  it('the cave troll is a real fight at level 7', () => {
    const rate = winRate(TROLL, ['troll'], 200, 3);
    expect(rate).toBeGreaterThan(0.75);
    expect(rate).toBeLessThan(0.99);
    // ...and dangerous if you rush in under-levelled.
    expect(winRate({ ...TROLL, level: 5 }, ['troll'], 200, 3)).toBeLessThan(0.5);
  });

  it('the Umbral Wyrm is challenging but winnable at level 10', () => {
    const rate = winRate(FINAL, ['wyrm'], 200, 5, 3);
    expect(rate).toBeGreaterThan(0.7);
    expect(rate).toBeLessThan(0.98);
    expect(winRate({ ...FINAL, level: 8 }, ['wyrm'], 200, 5, 3)).toBeLessThan(0.3);
  });
});
