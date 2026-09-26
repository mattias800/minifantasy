/**
 * Pure battle rules: damage formulas, effect resolution, turn speed, enemy AI.
 * No rendering here, so it can be unit-tested and balanced in isolation.
 */
import type { EnemyAction } from '../data/enemies';
import type { Effect, Element, StatusId } from '../data/types';
import { weightedPick, type Rng } from '../engine/math';
import type { Combatant, EnemyCombatant } from './Combatant';

export const CRIT_CHANCE = 0.06;
export const MISS_CHANCE = 0.04;
/** Physical damage multiplier while under Barrier. */
export const BARRIER_FACTOR = 0.6;
/** Damage multiplier while defending. */
export const DEFEND_FACTOR = 0.5;
/** Fraction of max HP lost to poison at the start of each turn. */
export const POISON_FRACTION = 1 / 12;

export type Outcome =
  | { kind: 'damage'; target: Combatant; amount: number; crit: boolean; weak: boolean }
  | { kind: 'heal'; target: Combatant; amount: number }
  | { kind: 'mp'; target: Combatant; amount: number }
  | { kind: 'revive'; target: Combatant; amount: number }
  | { kind: 'status'; target: Combatant; status: StatusId; added: boolean }
  | { kind: 'miss'; target: Combatant }
  | { kind: 'noEffect'; target: Combatant };

const variance = (rng: Rng) => 0.875 + rng() * 0.25;

export function elementMultiplier(target: Combatant, element: Element | undefined): number {
  if (!element || element === 'none') return 1;
  if (target.weak.includes(element)) return 2;
  if (target.resist.includes(element)) return 0.5;
  return 1;
}

/** Weapon damage before target modifiers. */
export function physicalBase(atk: number, def: number, multiplier: number): number {
  return ((atk * atk) / (atk + def)) * 1.5 * multiplier;
}

/** Spell damage/healing base before target modifiers. */
export function magicBase(power: number, mag: number): number {
  return (power * (4 + mag)) / 4;
}

export function magicDefenseFactor(mdef: number): number {
  return 40 / (40 + mdef);
}

/** ATB fill per millisecond. Speed 10 ≈ one turn every 2.5s. */
export function atbRate(spd: number): number {
  return (spd + 20) / 75000;
}

function damage(target: Combatant, amount: number, crit: boolean, mult: number): Outcome {
  const dealt = Math.max(1, Math.min(9999, Math.round(amount)));
  target.hp = Math.max(0, target.hp - dealt);
  return { kind: 'damage', target, amount: dealt, crit, weak: mult > 1 };
}

function tryInflict(target: Combatant, inflict: { status: StatusId; chance: number } | undefined, rng: Rng): Outcome | null {
  if (!inflict || !target.alive || target.statuses.has(inflict.status)) return null;
  if (rng() >= inflict.chance) return null;
  target.statuses.add(inflict.status);
  return { kind: 'status', target, status: inflict.status, added: true };
}

/** Applies one effect from `user` to `target`, mutating HP/MP/status, and reports what happened. */
export function applyEffect(user: Combatant, target: Combatant, effect: Effect, rng: Rng): Outcome[] {
  const out: Outcome[] = [];
  switch (effect.kind) {
    case 'physical': {
      if (!target.alive) return [{ kind: 'noEffect', target }];
      if (rng() < MISS_CHANCE) return [{ kind: 'miss', target }];
      const crit = rng() < CRIT_CHANCE;
      const mult = elementMultiplier(target, effect.element);
      let amount = physicalBase(user.atk, target.def, effect.multiplier) * variance(rng) * mult;
      if (crit) amount *= 2;
      if (target.statuses.has('barrier')) amount *= BARRIER_FACTOR;
      if (target.statuses.has('defending')) amount *= DEFEND_FACTOR;
      out.push(damage(target, amount, crit, mult));
      const status = tryInflict(target, effect.inflict, rng);
      if (status) out.push(status);
      return out;
    }
    case 'magic': {
      if (!target.alive) return [{ kind: 'noEffect', target }];
      const mult = elementMultiplier(target, effect.element);
      let amount = magicBase(effect.power, user.mag) * magicDefenseFactor(target.mdef) * variance(rng) * mult;
      if (target.statuses.has('defending')) amount *= DEFEND_FACTOR;
      out.push(damage(target, amount, false, mult));
      const status = tryInflict(target, effect.inflict, rng);
      if (status) out.push(status);
      return out;
    }
    case 'fixedDamage': {
      if (!target.alive) return [{ kind: 'noEffect', target }];
      const mult = elementMultiplier(target, effect.element);
      return [damage(target, effect.amount * mult, false, mult)];
    }
    case 'heal': {
      if (!target.alive) return [{ kind: 'noEffect', target }];
      const amount = Math.round(magicBase(effect.power, user.mag) * (0.95 + rng() * 0.1));
      if (target.undead) return [damage(target, amount, false, 2)];
      return [healHp(target, amount)];
    }
    case 'healFixed':
      if (!target.alive) return [{ kind: 'noEffect', target }];
      if (target.undead) return [damage(target, effect.amount / 2, false, 2)];
      return [healHp(target, effect.amount)];
    case 'restoreMp': {
      if (!target.alive) return [{ kind: 'noEffect', target }];
      const before = target.mp;
      target.mp = Math.min(target.maxMp, target.mp + effect.amount);
      return [{ kind: 'mp', target, amount: target.mp - before }];
    }
    case 'revive': {
      if (target.alive) return [{ kind: 'noEffect', target }];
      target.hp = Math.max(1, Math.floor((target.maxHp * effect.hpPercent) / 100));
      target.statuses.clear();
      target.atb = 0;
      return [{ kind: 'revive', target, amount: target.hp }];
    }
    case 'cure': {
      if (!target.alive || !target.statuses.has(effect.status)) return [{ kind: 'noEffect', target }];
      target.statuses.delete(effect.status);
      return [{ kind: 'status', target, status: effect.status, added: false }];
    }
    case 'addStatus': {
      const status = tryInflict(target, { status: effect.status, chance: effect.chance }, rng);
      return [status ?? { kind: 'noEffect', target }];
    }
  }
}

function healHp(target: Combatant, amount: number): Outcome {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
  return { kind: 'heal', target, amount: target.hp - before };
}

/** Picks an enemy action, unlocking "belowHp" moves once the enemy is hurt enough. */
export function chooseEnemyAction(enemy: EnemyCombatant, rng: Rng): EnemyAction {
  const frac = enemy.hpFraction;
  const available = enemy.def_.actions.filter((a) => a.belowHp === undefined || frac <= a.belowHp);
  return weightedPick(rng, available);
}

/** Chance to flee, based on the speed difference between the sides. */
export function fleeChance(partySpd: number, enemySpd: number): number {
  return Math.max(0.25, Math.min(0.95, 0.6 + (partySpd - enemySpd) * 0.04));
}

/** Poison damage for a turn. */
export function poisonDamage(c: Combatant): number {
  return Math.max(1, Math.floor(c.maxHp * POISON_FRACTION));
}
