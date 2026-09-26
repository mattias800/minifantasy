import type { EnemyArtId } from '../gfx/enemies';
import type { ItemId } from './items';
import type { AnimId, Effect, Element, TargetType } from './types';

export type EnemyId =
  | 'jelly'
  | 'hornhare'
  | 'goblin'
  | 'wolf'
  | 'sporecap'
  | 'bat'
  | 'magmajelly'
  | 'boneknight'
  | 'wisp'
  | 'golem'
  | 'troll'
  | 'wyrm';

export interface EnemyAction {
  /** Shown in the battle caption; omit for a plain attack. */
  name?: string;
  weight: number;
  /** Relative to the enemy: 'enemy' means one party member. */
  target: TargetType;
  effects: Effect[];
  anim: AnimId;
  /** Only used when the enemy's HP is at or below this fraction (boss phases). */
  belowHp?: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  art: EnemyArtId;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  mdef: number;
  spd: number;
  xp: number;
  gold: number;
  weak: readonly Element[];
  resist: readonly Element[];
  /** Undead are hurt by healing magic. */
  undead?: boolean;
  boss?: boolean;
  drop?: { item: ItemId; chance: number };
  actions: readonly EnemyAction[];
}

const attack = (weight = 1, anim: AnimId = 'claw'): EnemyAction => ({
  weight,
  target: 'enemy',
  effects: [{ kind: 'physical', multiplier: 1 }],
  anim,
});

const defs: EnemyDef[] = [
  // ------------------------------------------------------------ overworld (south)
  {
    id: 'jelly',
    name: 'Jelly',
    art: 'jelly',
    hp: 24, atk: 9, def: 3, mag: 4, mdef: 2, spd: 5,
    xp: 5, gold: 6,
    weak: ['fire'], resist: [],
    drop: { item: 'potion', chance: 0.12 },
    actions: [attack(1, 'bash')],
  },
  {
    id: 'hornhare',
    name: 'Horn Hare',
    art: 'hornrabbit',
    hp: 26, atk: 11, def: 4, mag: 2, mdef: 3, spd: 13,
    xp: 7, gold: 8,
    weak: [], resist: [],
    actions: [
      attack(3, 'bite'),
      { name: 'Horn Jab', weight: 1, target: 'enemy', effects: [{ kind: 'physical', multiplier: 1.5 }], anim: 'claw' },
    ],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    art: 'goblin',
    hp: 40, atk: 13, def: 6, mag: 3, mdef: 4, spd: 9,
    xp: 10, gold: 15,
    weak: [], resist: [],
    drop: { item: 'potion', chance: 0.18 },
    actions: [attack(1, 'bash')],
  },
  // ------------------------------------------------------------ overworld (north)
  {
    id: 'wolf',
    name: 'Dire Wolf',
    art: 'wolf',
    hp: 70, atk: 19, def: 6, mag: 3, mdef: 5, spd: 14,
    xp: 15, gold: 12,
    weak: ['fire'], resist: [],
    actions: [
      attack(3, 'bite'),
      { name: 'Savage Bite', weight: 1, target: 'enemy', effects: [{ kind: 'physical', multiplier: 1.6 }], anim: 'bite' },
    ],
  },
  {
    id: 'sporecap',
    name: 'Sporecap',
    art: 'sporecap',
    hp: 62, atk: 12, def: 8, mag: 9, mdef: 6, spd: 6,
    xp: 13, gold: 18,
    weak: ['fire'], resist: ['earth'],
    drop: { item: 'antidote', chance: 0.25 },
    actions: [
      attack(2, 'bash'),
      {
        name: 'Spore Cloud',
        weight: 1,
        target: 'allEnemies',
        effects: [{ kind: 'magic', power: 1.5, element: 'none', inflict: { status: 'poison', chance: 0.45 } }],
        anim: 'poison',
      },
    ],
  },
  // ------------------------------------------------------------ Hollow Grotto
  {
    id: 'bat',
    name: 'Cave Bat',
    art: 'bat',
    hp: 62, atk: 22, def: 6, mag: 4, mdef: 6, spd: 17,
    xp: 17, gold: 11,
    weak: ['bolt'], resist: ['earth'],
    actions: [attack(1, 'bite')],
  },
  {
    id: 'magmajelly',
    name: 'Magma Jelly',
    art: 'jelly_red',
    hp: 95, atk: 22, def: 10, mag: 18, mdef: 8, spd: 7,
    xp: 22, gold: 22,
    weak: ['ice'], resist: ['fire'],
    drop: { item: 'fireflask', chance: 0.1 },
    actions: [
      attack(2, 'bash'),
      { name: 'Ember', weight: 1, target: 'enemy', effects: [{ kind: 'magic', power: 4, element: 'fire' }], anim: 'fire' },
    ],
  },
  {
    id: 'boneknight',
    name: 'Bone Knight',
    art: 'skeleton',
    hp: 140, atk: 30, def: 14, mag: 5, mdef: 6, spd: 9,
    xp: 32, gold: 30,
    weak: ['fire', 'holy'], resist: ['ice'], undead: true,
    drop: { item: 'hipotion', chance: 0.12 },
    actions: [
      attack(3, 'slash'),
      { name: 'Rending Cut', weight: 1, target: 'enemy', effects: [{ kind: 'physical', multiplier: 1.5 }], anim: 'slash' },
    ],
  },
  {
    id: 'wisp',
    name: 'Wisp',
    art: 'wisp',
    hp: 85, atk: 10, def: 22, mag: 24, mdef: 14, spd: 15,
    xp: 28, gold: 26,
    weak: ['ice', 'holy'], resist: ['fire', 'bolt'], undead: true,
    drop: { item: 'ether', chance: 0.15 },
    actions: [
      { name: 'Spark', weight: 2, target: 'enemy', effects: [{ kind: 'magic', power: 4.5, element: 'bolt' }], anim: 'bolt' },
      { name: 'Will-o\'-Fire', weight: 1, target: 'enemy', effects: [{ kind: 'magic', power: 4, element: 'fire' }], anim: 'fire' },
    ],
  },
  {
    id: 'golem',
    name: 'Rock Golem',
    art: 'golem',
    hp: 230, atk: 38, def: 26, mag: 5, mdef: 6, spd: 4,
    xp: 48, gold: 40,
    weak: ['ice'], resist: ['fire', 'earth'],
    actions: [
      attack(3, 'bash'),
      { name: 'Rockfall', weight: 1, target: 'allEnemies', effects: [{ kind: 'physical', multiplier: 0.7, element: 'earth' }], anim: 'quake' },
    ],
  },
  // ------------------------------------------------------------ bosses
  {
    id: 'troll',
    name: 'Cave Troll',
    art: 'troll',
    hp: 1600, atk: 34, def: 12, mag: 8, mdef: 10, spd: 10,
    xp: 260, gold: 300,
    weak: ['fire'], resist: [], boss: true,
    drop: { item: 'hipotion', chance: 1 },
    actions: [
      attack(4, 'bash'),
      { name: 'Club Smash', weight: 2, target: 'enemy', effects: [{ kind: 'physical', multiplier: 1.7 }], anim: 'bash' },
      { name: 'Ground Pound', weight: 1, target: 'allEnemies', effects: [{ kind: 'physical', multiplier: 0.75, element: 'earth' }], anim: 'quake' },
    ],
  },
  {
    id: 'wyrm',
    name: 'Umbral Wyrm',
    art: 'wyrm',
    hp: 3000, atk: 40, def: 20, mag: 26, mdef: 18, spd: 13,
    xp: 0, gold: 0,
    weak: ['holy'], resist: ['earth'], boss: true,
    actions: [
      attack(4, 'claw'),
      { name: 'Tail Sweep', weight: 2, target: 'allEnemies', effects: [{ kind: 'physical', multiplier: 0.7 }], anim: 'bash' },
      {
        name: 'Venom Fang',
        weight: 1,
        target: 'enemy',
        effects: [{ kind: 'physical', multiplier: 1.2, inflict: { status: 'poison', chance: 0.8 } }],
        anim: 'bite',
      },
      { name: 'Shadow Breath', weight: 2, target: 'allEnemies', effects: [{ kind: 'magic', power: 5, element: 'none' }], anim: 'shadow' },
      // Enraged phase
      { name: 'Umbral Flare', weight: 2, target: 'enemy', effects: [{ kind: 'magic', power: 11, element: 'none' }], anim: 'nova', belowHp: 0.5 },
      { name: 'Crystal Storm', weight: 2, target: 'allEnemies', effects: [{ kind: 'physical', multiplier: 0.9, element: 'earth' }], anim: 'quake', belowHp: 0.5 },
    ],
  },
];

export const ENEMIES: Readonly<Record<EnemyId, EnemyDef>> = Object.fromEntries(defs.map((d) => [d.id, d])) as Record<
  EnemyId,
  EnemyDef
>;

export function enemy(id: EnemyId): EnemyDef {
  return ENEMIES[id];
}
