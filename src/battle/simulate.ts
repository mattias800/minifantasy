/**
 * Headless battle simulator used for balancing: plays out a fight with a
 * simple but sensible party AI, using the same rules as the real battles.
 */
import { enemy, type EnemyId } from '../data/enemies';
import { spell, type SpellDef } from '../data/spells';
import type { Rng } from '../engine/math';
import type { PartyMember } from '../game/PartyMember';
import { Combatant, EnemyCombatant, PartyCombatant } from './Combatant';
import { applyEffect, atbRate, chooseEnemyAction, poisonDamage } from './rules';

export interface SimResult {
  won: boolean;
  /** Simulated seconds. */
  seconds: number;
  partyHpLeft: number;
  potionsUsed: number;
}

export interface SimOptions {
  potions?: number;
  ethers?: number;
  maxSeconds?: number;
}

const TICK_MS = 50;

export function simulateBattle(party: PartyMember[], enemyIds: EnemyId[], rng: Rng, opts: SimOptions = {}): SimResult {
  const heroes = party.map((m) => new PartyCombatant(m));
  const foes = enemyIds.map((id) => new EnemyCombatant(enemy(id), id));
  const all: Combatant[] = [...heroes, ...foes];
  let potions = opts.potions ?? 0;
  let ethers = opts.ethers ?? 0;
  let potionsUsed = 0;
  let time = 0;
  const maxMs = (opts.maxSeconds ?? 600) * 1000;
  heroes.forEach((h) => (h.atb = 0.3 + rng() * 0.4));
  foes.forEach((f) => (f.atb = rng() * 0.4));

  const living = (side: Combatant[]) => side.filter((c) => c.alive);
  const cast = (user: PartyCombatant, sp: SpellDef, targets: Combatant[]) => {
    user.mp -= sp.mp;
    for (const t of targets) for (const e of sp.effects) applyEffect(user, t, e, rng);
  };

  while (living(heroes).length && living(foes).length && time < maxMs) {
    time += TICK_MS;
    for (const c of all) {
      if (!c.alive) continue;
      c.atb += atbRate(c.spd) * TICK_MS;
      if (c.atb < 1) continue;
      c.atb = 0;
      if (c.statuses.has('poison')) c.hp = Math.max(0, c.hp - poisonDamage(c));
      if (!c.alive) continue;
      const allies = living(heroes);
      const targets = living(foes);
      if (!targets.length || !allies.length) break;

      if (c instanceof EnemyCombatant) {
        const action = chooseEnemyAction(c, rng);
        const tg = action.target === 'allEnemies' ? allies : [allies[Math.floor(rng() * allies.length)]];
        for (const t of tg) for (const e of action.effects) applyEffect(c, t, e, rng);
        continue;
      }

      const h = c as PartyCombatant;
      const known = h.member.spells().map(spell).filter((s) => s.mp <= h.mp);
      const hurt = allies.filter((a) => a.hpFraction < 0.5);
      const dead = heroes.filter((a) => !a.alive);
      const target = targets.reduce((a, b) => (a.hp < b.hp ? a : b));

      // Healer priorities: revive, group heal, single heal.
      const revive = known.find((s) => s.target === 'deadAlly');
      const mend = known.find((s) => s.id === 'mend');
      const heal = known.find((s) => s.id === 'heal');
      if (dead.length && revive) {
        cast(h, revive, [dead[0]]);
        continue;
      }
      if (hurt.length >= 2 && mend) {
        cast(h, mend, allies);
        continue;
      }
      if (hurt.length && heal && h.member.id === 'cleric') {
        cast(h, heal, [hurt.reduce((a, b) => (a.hpFraction < b.hpFraction ? a : b))]);
        continue;
      }
      const critical = allies.find((a) => a.hpFraction < 0.3);
      if (critical && potions > 0) {
        potions--;
        potionsUsed++;
        critical.hp = Math.min(critical.maxHp, critical.hp + 160);
        continue;
      }
      if (h.mp < 6 && ethers > 0 && h.member.id !== 'hero') {
        ethers--;
        h.mp = Math.min(h.maxMp, h.mp + 25);
        continue;
      }
      // Offense: the most damaging affordable ability against the weakest foe.
      const offensive = known
        .filter((s) => s.target === 'enemy' || s.target === 'allEnemies')
        .map((s) => ({ s, score: scoreSpell(h, s, targets) }))
        .sort((a, b) => b.score - a.score)[0];
      const basic = h.atk;
      if (offensive && offensive.score > basic * 1.2) {
        cast(h, offensive.s, offensive.s.target === 'allEnemies' ? targets : [target]);
      } else {
        applyEffect(h, target, { kind: 'physical', multiplier: 1 }, rng);
      }
    }
  }
  const won = living(foes).length === 0;
  heroes.forEach((h) => {
    h.statuses.delete('barrier');
    h.statuses.delete('defending');
  });
  return { won, seconds: time / 1000, partyHpLeft: heroes.reduce((s, h) => s + h.hp, 0), potionsUsed };
}

/** Rough expected damage of an ability, used only to pick moves. */
function scoreSpell(user: PartyCombatant, sp: SpellDef, targets: Combatant[]): number {
  let score = 0;
  for (const e of sp.effects) {
    if (e.kind === 'magic') {
      const weak = targets.some((t) => t.weak.includes(e.element)) ? 2 : 1;
      score += e.power * (4 + user.mag) * 0.25 * weak;
    } else if (e.kind === 'physical') {
      const weak = e.element && targets.some((t) => t.weak.includes(e.element!)) ? 2 : 1;
      score += user.atk * e.multiplier * weak;
    }
  }
  return sp.target === 'allEnemies' ? score * Math.min(targets.length, 3) * 0.8 : score;
}
