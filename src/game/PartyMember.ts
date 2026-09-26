import { item, isEquipment, type EquipSlot, type EquipStats, type ItemId } from '../data/items';
import { MAX_LEVEL, PARTY_CLASSES, xpForLevel, type PartyClassDef } from '../data/party';
import type { SpellId } from '../data/spells';
import type { PartyMemberId, Stats, StatusId } from '../data/types';

export interface LevelUp {
  level: number;
  learned: SpellId[];
}

export interface PartyMemberSave {
  id: PartyMemberId;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  poisoned: boolean;
  equipment: Record<EquipSlot, ItemId | null>;
}

/** A persistent party member: level, experience, equipment and current HP/MP. */
export class PartyMember {
  level = 1;
  xp = 0;
  hp = 0;
  mp = 0;
  /** Battle statuses; only poison survives outside battle. */
  readonly statuses = new Set<StatusId>();
  readonly equipment: Record<EquipSlot, ItemId | null>;

  constructor(readonly id: PartyMemberId) {
    const cls = PARTY_CLASSES[id];
    this.equipment = { ...cls.startingEquipment };
    this.hp = this.maxHp;
    this.mp = this.maxMp;
  }

  get cls(): PartyClassDef {
    return PARTY_CLASSES[this.id];
  }

  get name(): string {
    return this.cls.name;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  private baseStat(key: keyof Stats, level = this.level): number {
    return Math.floor(this.cls.base[key] + this.cls.growth[key] * (level - 1));
  }

  private equipBonus(key: keyof EquipStats): number {
    let total = 0;
    for (const id of Object.values(this.equipment)) {
      if (!id) continue;
      const def = item(id);
      if (isEquipment(def)) total += def.stats[key] ?? 0;
    }
    return total;
  }

  get maxHp(): number {
    return this.baseStat('hp');
  }
  get maxMp(): number {
    return this.baseStat('mp');
  }
  get str(): number {
    return this.baseStat('str');
  }
  /** Attack power: strength plus weapon. */
  get atk(): number {
    return this.str + this.equipBonus('atk');
  }
  get mag(): number {
    return this.baseStat('mag') + this.equipBonus('mag');
  }
  get def(): number {
    return this.baseStat('def') + this.equipBonus('def');
  }
  get mdef(): number {
    return this.baseStat('mdef') + this.equipBonus('mdef');
  }
  get spd(): number {
    return this.baseStat('spd');
  }

  /** Experience still needed to reach the next level. */
  get xpToNext(): number {
    return this.level >= MAX_LEVEL ? 0 : xpForLevel(this.level + 1) - this.xp;
  }

  spells(): SpellId[] {
    return this.cls.learnset.filter((l) => l.level <= this.level).map((l) => l.spell);
  }

  /** Adds experience and returns any levels gained (HP/MP grow by the same amount as the max). */
  gainXp(amount: number): LevelUp[] {
    const ups: LevelUp[] = [];
    this.xp += amount;
    while (this.level < MAX_LEVEL && this.xp >= xpForLevel(this.level + 1)) {
      const oldHp = this.maxHp;
      const oldMp = this.maxMp;
      this.level++;
      if (this.alive) this.hp += this.maxHp - oldHp;
      this.mp += this.maxMp - oldMp;
      ups.push({
        level: this.level,
        learned: this.cls.learnset.filter((l) => l.level === this.level).map((l) => l.spell),
      });
    }
    return ups;
  }

  /** Stat preview if `itemId` were equipped in its slot. */
  previewEquip(slot: EquipSlot, itemId: ItemId | null): { atk: number; def: number; mag: number; mdef: number } {
    const prev = this.equipment[slot];
    this.equipment[slot] = itemId;
    const result = { atk: this.atk, def: this.def, mag: this.mag, mdef: this.mdef };
    this.equipment[slot] = prev;
    return result;
  }

  canEquip(itemId: ItemId): boolean {
    const def = item(itemId);
    return isEquipment(def) && def.equippableBy.includes(this.id);
  }

  heal(amount: number): number {
    if (!this.alive) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  restoreMp(amount: number): number {
    const before = this.mp;
    this.mp = Math.min(this.maxMp, this.mp + amount);
    return this.mp - before;
  }

  /** Full restore, as at an inn. */
  restoreAll(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.statuses.clear();
  }

  toSave(): PartyMemberSave {
    return {
      id: this.id,
      level: this.level,
      xp: this.xp,
      hp: this.hp,
      mp: this.mp,
      poisoned: this.statuses.has('poison'),
      equipment: { ...this.equipment },
    };
  }

  static fromSave(data: PartyMemberSave): PartyMember {
    const m = new PartyMember(data.id);
    m.level = data.level;
    m.xp = data.xp;
    Object.assign(m.equipment, data.equipment);
    m.hp = Math.min(data.hp, m.maxHp);
    m.mp = Math.min(data.mp, m.maxMp);
    if (data.poisoned) m.statuses.add('poison');
    return m;
  }
}
