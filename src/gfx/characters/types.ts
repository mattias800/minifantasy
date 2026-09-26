/** Shared type definitions for character sprites (re-exported by `../characters.ts`). */

export type Facing = 'down' | 'up' | 'left' | 'right';

export type FieldSpriteId =
  | 'hero'
  | 'cleric'
  | 'mage'
  | 'elder'
  | 'man'
  | 'woman'
  | 'child'
  | 'merchant'
  | 'innkeeper'
  | 'guard'
  | 'cat'
  | 'spirit';

export type PartyMemberId = 'hero' | 'cleric' | 'mage';

export type BattlePose =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'cast'
  | 'item'
  | 'defend'
  | 'hurt'
  | 'weak'
  | 'dead'
  | 'victory';
