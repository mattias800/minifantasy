import type { ItemId } from './items';

export type ShopId = 'items' | 'arms';

export interface ShopDef {
  id: ShopId;
  name: string;
  greeting: string;
  stock: readonly ItemId[];
}

export const SHOPS: Readonly<Record<ShopId, ShopDef>> = {
  items: {
    id: 'items',
    name: 'Item Shop',
    greeting: 'Welcome! What can I get you?',
    stock: ['potion', 'hipotion', 'ether', 'antidote', 'plume', 'fireflask'],
  },
  arms: {
    id: 'arms',
    name: 'Armory',
    greeting: 'Finest steel this side of the river!',
    stock: ['iron_sword', 'silver_staff', 'ember_rod', 'chainmail', 'silk_robe', 'leather', 'cloth_robe'],
  },
};
