/** Shared vocabulary used by items, spells, enemies and the battle system. */

export type Element = 'none' | 'fire' | 'ice' | 'bolt' | 'holy' | 'earth';

export type StatusId = 'poison' | 'barrier' | 'defending';

export type PartyMemberId = 'hero' | 'cleric' | 'mage';

/**
 * Who an ability or item can be aimed at.
 * `ally`/`enemy` pick a single living target, `deadAlly` a KO'd party member.
 */
export type TargetType = 'self' | 'ally' | 'allAllies' | 'deadAlly' | 'enemy' | 'allEnemies';

/** Visual effect played when an ability resolves. */
export type AnimId =
  | 'slash'
  | 'bash'
  | 'claw'
  | 'bite'
  | 'fire'
  | 'ice'
  | 'bolt'
  | 'holy'
  | 'quake'
  | 'nova'
  | 'shadow'
  | 'heal'
  | 'revive'
  | 'buff'
  | 'cure'
  | 'poison'
  | 'ether';

export type Effect =
  /** Magic damage scaled by the user's MAG. */
  | { kind: 'magic'; power: number; element: Element; inflict?: { status: StatusId; chance: number } }
  /** Weapon damage multiplied by `multiplier`, optionally elemental. */
  | { kind: 'physical'; multiplier: number; element?: Element; inflict?: { status: StatusId; chance: number } }
  /** Fixed damage regardless of stats (thrown items). */
  | { kind: 'fixedDamage'; amount: number; element: Element }
  /** Healing scaled by MAG. Hurts undead. */
  | { kind: 'heal'; power: number }
  /** Flat HP restore (potions). Use a large amount for "full". */
  | { kind: 'healFixed'; amount: number }
  | { kind: 'restoreMp'; amount: number }
  | { kind: 'revive'; hpPercent: number }
  | { kind: 'cure'; status: StatusId }
  | { kind: 'addStatus'; status: StatusId; chance: number };

export interface Stats {
  hp: number;
  mp: number;
  str: number;
  mag: number;
  def: number;
  mdef: number;
  spd: number;
}
