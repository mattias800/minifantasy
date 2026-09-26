import type { AnimId, Effect, TargetType } from './types';

export type SpellId =
  // Kael's sword techniques
  | 'powerstrike'
  | 'whirlslash'
  | 'dawnblade'
  // Lyra's white magic
  | 'heal'
  | 'purify'
  | 'barrier'
  | 'mend'
  | 'rekindle'
  | 'radiance'
  // Orrin's black magic
  | 'flame'
  | 'frost'
  | 'spark'
  | 'firestorm'
  | 'starfall';

export interface SpellDef {
  id: SpellId;
  name: string;
  description: string;
  mp: number;
  target: TargetType;
  effects: Effect[];
  anim: AnimId;
  usableInField: boolean;
}

const defs: SpellDef[] = [
  {
    id: 'powerstrike',
    name: 'Power Strike',
    description: 'A heavy two-handed blow.',
    mp: 3,
    target: 'enemy',
    effects: [{ kind: 'physical', multiplier: 1.8 }],
    anim: 'slash',
    usableInField: false,
  },
  {
    id: 'whirlslash',
    name: 'Whirl Slash',
    description: 'A spinning cut that hits all foes.',
    mp: 7,
    target: 'allEnemies',
    effects: [{ kind: 'physical', multiplier: 1.0 }],
    anim: 'slash',
    usableInField: false,
  },
  {
    id: 'dawnblade',
    name: 'Dawnblade',
    description: 'A holy strike, deadly to darkness.',
    mp: 12,
    target: 'enemy',
    effects: [{ kind: 'physical', multiplier: 2.4, element: 'holy' }],
    anim: 'holy',
    usableInField: false,
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restores HP to one ally.',
    mp: 3,
    target: 'ally',
    effects: [{ kind: 'heal', power: 9 }],
    anim: 'heal',
    usableInField: true,
  },
  {
    id: 'purify',
    name: 'Purify',
    description: 'Cures poison.',
    mp: 2,
    target: 'ally',
    effects: [{ kind: 'cure', status: 'poison' }],
    anim: 'cure',
    usableInField: true,
  },
  {
    id: 'barrier',
    name: 'Barrier',
    description: 'Shields an ally from harm.',
    mp: 5,
    target: 'ally',
    effects: [{ kind: 'addStatus', status: 'barrier', chance: 1 }],
    anim: 'buff',
    usableInField: false,
  },
  {
    id: 'mend',
    name: 'Mend',
    description: 'Restores HP to the whole party.',
    mp: 9,
    target: 'allAllies',
    effects: [{ kind: 'heal', power: 6 }],
    anim: 'heal',
    usableInField: true,
  },
  {
    id: 'rekindle',
    name: 'Rekindle',
    description: 'Revives a fallen ally.',
    mp: 14,
    target: 'deadAlly',
    effects: [{ kind: 'revive', hpPercent: 35 }],
    anim: 'revive',
    usableInField: true,
  },
  {
    id: 'radiance',
    name: 'Radiance',
    description: 'Searing holy light.',
    mp: 12,
    target: 'enemy',
    effects: [{ kind: 'magic', power: 11, element: 'holy' }],
    anim: 'holy',
    usableInField: false,
  },
  {
    id: 'flame',
    name: 'Flame',
    description: 'Scorches one foe with fire.',
    mp: 4,
    target: 'enemy',
    effects: [{ kind: 'magic', power: 6, element: 'fire' }],
    anim: 'fire',
    usableInField: false,
  },
  {
    id: 'frost',
    name: 'Frost',
    description: 'Freezes one foe with ice.',
    mp: 4,
    target: 'enemy',
    effects: [{ kind: 'magic', power: 6, element: 'ice' }],
    anim: 'ice',
    usableInField: false,
  },
  {
    id: 'spark',
    name: 'Spark',
    description: 'Strikes one foe with lightning.',
    mp: 5,
    target: 'enemy',
    effects: [{ kind: 'magic', power: 7, element: 'bolt' }],
    anim: 'bolt',
    usableInField: false,
  },
  {
    id: 'firestorm',
    name: 'Firestorm',
    description: 'Engulfs all foes in flame.',
    mp: 10,
    target: 'allEnemies',
    effects: [{ kind: 'magic', power: 5, element: 'fire' }],
    anim: 'fire',
    usableInField: false,
  },
  {
    id: 'starfall',
    name: 'Starfall',
    description: 'Calls down raw starlight.',
    mp: 16,
    target: 'enemy',
    effects: [{ kind: 'magic', power: 14, element: 'none' }],
    anim: 'nova',
    usableInField: false,
  },
];

export const SPELLS: Readonly<Record<SpellId, SpellDef>> = Object.fromEntries(defs.map((d) => [d.id, d])) as Record<
  SpellId,
  SpellDef
>;

export function spell(id: SpellId): SpellDef {
  return SPELLS[id];
}
