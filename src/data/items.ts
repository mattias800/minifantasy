import type { AnimId, Effect, PartyMemberId, TargetType } from './types';

export type ItemId =
  // consumables
  | 'potion'
  | 'hipotion'
  | 'ether'
  | 'antidote'
  | 'plume'
  | 'fireflask'
  | 'elixir'
  // weapons
  | 'bronze_sword'
  | 'iron_sword'
  | 'runeblade'
  | 'oak_staff'
  | 'silver_staff'
  | 'ash_rod'
  | 'ember_rod'
  | 'moon_rod'
  // armor
  | 'leather'
  | 'chainmail'
  | 'cloth_robe'
  | 'silk_robe'
  | 'sage_robe'
  // key items
  | 'suncharm';

export type EquipSlot = 'weapon' | 'armor';

export interface EquipStats {
  atk?: number;
  def?: number;
  mag?: number;
  mdef?: number;
}

interface ItemBase {
  id: ItemId;
  name: string;
  description: string;
  /** Shop price. Items sell for half. 0 = cannot be sold. */
  price: number;
}

export interface ConsumableDef extends ItemBase {
  kind: 'consumable';
  target: TargetType;
  effects: Effect[];
  anim: AnimId;
  usableInField: boolean;
}

export interface EquipmentDef extends ItemBase {
  kind: 'equipment';
  slot: EquipSlot;
  stats: EquipStats;
  equippableBy: readonly PartyMemberId[];
}

export interface KeyItemDef extends ItemBase {
  kind: 'key';
}

export type ItemDef = ConsumableDef | EquipmentDef | KeyItemDef;

const ALL: readonly PartyMemberId[] = ['hero', 'cleric', 'mage'];
const CASTERS: readonly PartyMemberId[] = ['cleric', 'mage'];

const defs: ItemDef[] = [
  {
    id: 'potion',
    kind: 'consumable',
    name: 'Potion',
    description: 'Restores 50 HP to one ally.',
    price: 25,
    target: 'ally',
    effects: [{ kind: 'healFixed', amount: 50 }],
    anim: 'heal',
    usableInField: true,
  },
  {
    id: 'hipotion',
    kind: 'consumable',
    name: 'Hi-Potion',
    description: 'Restores 160 HP to one ally.',
    price: 90,
    target: 'ally',
    effects: [{ kind: 'healFixed', amount: 160 }],
    anim: 'heal',
    usableInField: true,
  },
  {
    id: 'ether',
    kind: 'consumable',
    name: 'Ether',
    description: 'Restores 25 MP to one ally.',
    price: 120,
    target: 'ally',
    effects: [{ kind: 'restoreMp', amount: 25 }],
    anim: 'ether',
    usableInField: true,
  },
  {
    id: 'antidote',
    kind: 'consumable',
    name: 'Antidote',
    description: 'Cures poison.',
    price: 15,
    target: 'ally',
    effects: [{ kind: 'cure', status: 'poison' }],
    anim: 'cure',
    usableInField: true,
  },
  {
    id: 'plume',
    kind: 'consumable',
    name: 'Soul Plume',
    description: 'Revives a fallen ally with 25% HP.',
    price: 200,
    target: 'deadAlly',
    effects: [{ kind: 'revive', hpPercent: 25 }],
    anim: 'revive',
    usableInField: true,
  },
  {
    id: 'fireflask',
    kind: 'consumable',
    name: 'Fire Flask',
    description: 'Hurl it: 60 fire damage to all foes.',
    price: 100,
    target: 'allEnemies',
    effects: [{ kind: 'fixedDamage', amount: 60, element: 'fire' }],
    anim: 'fire',
    usableInField: false,
  },
  {
    id: 'elixir',
    kind: 'consumable',
    name: 'Elixir',
    description: 'Fully restores HP and MP of one ally.',
    price: 0,
    target: 'ally',
    effects: [
      { kind: 'healFixed', amount: 9999 },
      { kind: 'restoreMp', amount: 999 },
    ],
    anim: 'revive',
    usableInField: true,
  },

  // --- weapons
  { id: 'bronze_sword', kind: 'equipment', slot: 'weapon', name: 'Bronze Sword', description: 'A plain but trusty blade.', price: 60, stats: { atk: 5 }, equippableBy: ['hero'] },
  { id: 'iron_sword', kind: 'equipment', slot: 'weapon', name: 'Iron Sword', description: 'Forged in Willowmere. ATK +13.', price: 280, stats: { atk: 13 }, equippableBy: ['hero'] },
  { id: 'runeblade', kind: 'equipment', slot: 'weapon', name: 'Runeblade', description: 'Ancient runes hum along its edge.', price: 0, stats: { atk: 24, mag: 3 }, equippableBy: ['hero'] },
  { id: 'oak_staff', kind: 'equipment', slot: 'weapon', name: 'Oak Staff', description: 'A simple walking staff.', price: 50, stats: { atk: 3, mag: 1 }, equippableBy: ['cleric'] },
  { id: 'silver_staff', kind: 'equipment', slot: 'weapon', name: 'Silver Staff', description: 'Blessed silver. MAG +5.', price: 260, stats: { atk: 6, mag: 5 }, equippableBy: ['cleric'] },
  { id: 'ash_rod', kind: 'equipment', slot: 'weapon', name: 'Ash Rod', description: 'A crooked rod of ash wood.', price: 50, stats: { atk: 2, mag: 2 }, equippableBy: ['mage'] },
  { id: 'ember_rod', kind: 'equipment', slot: 'weapon', name: 'Ember Rod', description: 'Warm to the touch. MAG +6.', price: 300, stats: { atk: 4, mag: 6 }, equippableBy: ['mage'] },
  { id: 'moon_rod', kind: 'equipment', slot: 'weapon', name: 'Moonstone Rod', description: 'Glows with pale lunar light.', price: 0, stats: { atk: 5, mag: 9 }, equippableBy: CASTERS },

  // --- armor
  { id: 'leather', kind: 'equipment', slot: 'armor', name: 'Leather Armor', description: 'Tough hide armor. DEF +3.', price: 60, stats: { def: 3 }, equippableBy: ALL },
  { id: 'chainmail', kind: 'equipment', slot: 'armor', name: 'Chain Mail', description: 'Interlocked iron rings. DEF +9.', price: 300, stats: { def: 9, mdef: 2 }, equippableBy: ['hero'] },
  { id: 'cloth_robe', kind: 'equipment', slot: 'armor', name: 'Cloth Robe', description: 'A traveler\'s robe.', price: 40, stats: { def: 2, mdef: 2 }, equippableBy: CASTERS },
  { id: 'silk_robe', kind: 'equipment', slot: 'armor', name: 'Silk Robe', description: 'Light, fine silk. DEF +5.', price: 240, stats: { def: 5, mdef: 5, mag: 2 }, equippableBy: CASTERS },
  { id: 'sage_robe', kind: 'equipment', slot: 'armor', name: 'Sage\'s Robe', description: 'Woven with protective sigils.', price: 0, stats: { def: 9, mdef: 10, mag: 4 }, equippableBy: CASTERS },

  // --- key items
  { id: 'suncharm', kind: 'key', name: 'Sun Charm', description: 'Breaks the seal on the Hollow Grotto.', price: 0 },
];

export const ITEMS: Readonly<Record<ItemId, ItemDef>> = Object.fromEntries(defs.map((d) => [d.id, d])) as Record<
  ItemId,
  ItemDef
>;

export function item(id: ItemId): ItemDef {
  return ITEMS[id];
}

export function isConsumable(def: ItemDef): def is ConsumableDef {
  return def.kind === 'consumable';
}

export function isEquipment(def: ItemDef): def is EquipmentDef {
  return def.kind === 'equipment';
}
