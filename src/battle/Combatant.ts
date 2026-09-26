import type { EnemyDef } from '../data/enemies';
import type { Element, StatusId } from '../data/types';
import type { PartyMember } from '../game/PartyMember';

/** Common view of anyone fighting in a battle. */
export abstract class Combatant {
  /** Active-time gauge, 0..1. */
  atb = 0;
  abstract readonly name: string;
  abstract readonly isEnemy: boolean;
  abstract hp: number;
  abstract mp: number;
  abstract readonly maxHp: number;
  abstract readonly maxMp: number;
  abstract readonly atk: number;
  abstract readonly def: number;
  abstract readonly mag: number;
  abstract readonly mdef: number;
  abstract readonly spd: number;
  abstract readonly statuses: Set<StatusId>;
  abstract readonly weak: readonly Element[];
  abstract readonly resist: readonly Element[];
  readonly undead: boolean = false;

  get alive(): boolean {
    return this.hp > 0;
  }

  get hpFraction(): number {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }
}

/** A party member in battle. HP/MP/status changes write straight through to the persistent PartyMember. */
export class PartyCombatant extends Combatant {
  readonly isEnemy = false;
  readonly weak: readonly Element[] = [];
  readonly resist: readonly Element[] = [];

  constructor(readonly member: PartyMember) {
    super();
  }

  get name() {
    return this.member.name;
  }
  get hp() {
    return this.member.hp;
  }
  set hp(v: number) {
    this.member.hp = v;
  }
  get mp() {
    return this.member.mp;
  }
  set mp(v: number) {
    this.member.mp = v;
  }
  get maxHp() {
    return this.member.maxHp;
  }
  get maxMp() {
    return this.member.maxMp;
  }
  get atk() {
    return this.member.atk;
  }
  get def() {
    return this.member.def;
  }
  get mag() {
    return this.member.mag;
  }
  get mdef() {
    return this.member.mdef;
  }
  get spd() {
    return this.member.spd;
  }
  get statuses() {
    return this.member.statuses;
  }
}

export class EnemyCombatant extends Combatant {
  readonly isEnemy = true;
  hp: number;
  mp = 0;
  readonly maxMp = 0;
  readonly statuses = new Set<StatusId>();
  override readonly undead: boolean;

  constructor(
    readonly def_: EnemyDef,
    /** Display name, with a letter suffix when several of the same enemy appear ("Jelly A"). */
    readonly name: string,
  ) {
    super();
    this.hp = def_.hp;
    this.undead = !!def_.undead;
  }

  get maxHp() {
    return this.def_.hp;
  }
  get atk() {
    return this.def_.atk;
  }
  get def() {
    return this.def_.def;
  }
  get mag() {
    return this.def_.mag;
  }
  get mdef() {
    return this.def_.mdef;
  }
  get spd() {
    return this.def_.spd;
  }
  get weak() {
    return this.def_.weak;
  }
  get resist() {
    return this.def_.resist;
  }
}
