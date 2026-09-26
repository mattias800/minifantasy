/**
 * Character sprites: 16x16 field sprites for everyone, plus 32x32 battle sprites
 * and 24x24 portraits for the three party members. Everything is generated at
 * runtime from hand-authored string grids (see `./characters/*`) and cached.
 */
import type { FieldSpriteId } from './characters/types';

export type { BattlePose, Facing, FieldSpriteId, PartyMemberId } from './characters/types';
export { getFieldSprite } from './characters/field';
export { battlePoseFrameCount, getBattleSprite } from './characters/battle';
export { getPortrait } from './characters/portraits';

export const FIELD_SPRITE_IDS: readonly FieldSpriteId[] = [
  'hero',
  'cleric',
  'mage',
  'elder',
  'man',
  'woman',
  'child',
  'merchant',
  'innkeeper',
  'guard',
  'cat',
  'spirit',
];
