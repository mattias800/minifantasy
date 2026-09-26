import { audio } from '../../audio/Audio';
import { PartyCombatant } from '../../battle/Combatant';
import { applyEffect, type Outcome } from '../../battle/rules';
import { MAPS } from '../../data/maps';
import { isConsumable, isEquipment, item, type EquipSlot, type ItemId } from '../../data/items';
import { spell, type SpellDef } from '../../data/spells';
import type { Effect, TargetType } from '../../data/types';
import { SCREEN_H, SCREEN_W } from '../../engine/constants';
import { drawText, drawTextRight, FONT_LINE_HEIGHT, wrapText } from '../../engine/font';
import { Scene } from '../../engine/Scene';
import type { GameState } from '../../game/GameState';
import type { PartyMember } from '../../game/PartyMember';
import { saveGame } from '../../game/save';
import { getPortrait } from '../../gfx/characters';
import { COLOR_BAD, COLOR_DISABLED, COLOR_GOOD, COLOR_HIGHLIGHT, COLOR_LABEL, COLOR_TEXT } from '../../ui/colors';
import { Menu } from '../../ui/Menu';
import { MessageScene } from '../../ui/MessageScene';
import { drawCursor, drawWindow } from '../../ui/Window';
import { drawHpMp, drawMemberCard, drawMemberCompact, memberNameColor } from './partyPanel';

type Mode = 'main' | 'pickMember' | 'items' | 'spells' | 'target' | 'equipSlots' | 'equipList' | 'status';
type Purpose = 'magic' | 'equip' | 'status';

interface PendingUse {
  target: TargetType;
  effects: Effect[];
  /** Pays the cost after a successful use (consume the item / spend MP). */
  pay: () => void;
  /** Whether it can be used again straight away (keeps the target picker open). */
  canRepeat: () => boolean;
  caster: PartyMember | null;
  back: Mode;
}

const COMMANDS = ['Items', 'Magic', 'Equip', 'Status', 'Save', 'Close'] as const;
const CARD_Y0 = 12;
const CARD_STEP = 68;
const SLOTS: readonly EquipSlot[] = ['weapon', 'armor'];

/** The field menu: party overview, items, magic, equipment, status and saving. */
export class MenuScene extends Scene {
  override transparent = false;
  private mode: Mode = 'main';
  private readonly main = new Menu(
    COMMANDS.map((label) => ({ label })),
    { x: 206, y: 12, width: 44, rows: COMMANDS.length },
  );
  private purpose: Purpose = 'status';
  private member = 0;
  private readonly itemMenu = new Menu([], { x: 22, y: 34, width: 226, rows: 14, columns: 2, columnWidth: 118 });
  private itemIds: ItemId[] = [];
  private readonly spellMenu = new Menu([], { x: 22, y: 50, width: 226, rows: 12, columns: 2, columnWidth: 118 });
  private spells: SpellDef[] = [];
  private readonly slotMenu = new Menu([], { x: 22, y: 50, width: 226, rows: 2 });
  private readonly equipMenu = new Menu([], { x: 132, y: 96, width: 116, rows: 9 });
  private equipIds: Array<ItemId | null> = [];
  private pending: PendingUse | null = null;
  private targetIndex = 0;

  constructor(
    private readonly state: GameState,
    private readonly opts: { canSave: boolean },
  ) {
    super();
    this.main.items[4].enabled = opts.canSave;
  }

  private get party(): PartyMember[] {
    return this.state.party;
  }

  private get current(): PartyMember {
    return this.party[this.member];
  }

  private say(text: string): Promise<number> {
    return this.game.run(new MessageScene(text));
  }

  // ------------------------------------------------------------------ update

  update(): void {
    const input = this.game.input;
    switch (this.mode) {
      case 'main':
        return this.updateMain();
      case 'pickMember':
        return this.updatePickMember();
      case 'items': {
        const ev = this.itemMenu.update(input);
        if (ev === 'cancel') this.mode = 'main';
        if (ev === 'select') this.useItem(this.itemIds[this.itemMenu.index]);
        return;
      }
      case 'spells': {
        const ev = this.spellMenu.update(input);
        if (ev === 'cancel') this.mode = 'pickMember';
        if (ev === 'select') this.castSpell(this.spells[this.spellMenu.index]);
        return;
      }
      case 'target':
        return this.updateTarget();
      case 'equipSlots': {
        const ev = this.slotMenu.update(input);
        if (ev === 'cancel') this.mode = 'pickMember';
        if (ev === 'select') this.openEquipList();
        return;
      }
      case 'equipList': {
        const ev = this.equipMenu.update(input);
        if (ev === 'cancel') this.mode = 'equipSlots';
        if (ev === 'select') this.equip(this.equipIds[this.equipMenu.index]);
        return;
      }
      case 'status': {
        if (input.pressed('cancel') || input.pressed('confirm')) {
          audio.playSfx('cancel');
          this.mode = 'pickMember';
        } else if (input.repeat('down') || input.repeat('right')) {
          this.member = (this.member + 1) % this.party.length;
          audio.playSfx('cursor');
        } else if (input.repeat('up') || input.repeat('left')) {
          this.member = (this.member + this.party.length - 1) % this.party.length;
          audio.playSfx('cursor');
        }
        return;
      }
    }
  }

  private updateMain(): void {
    const ev = this.main.update(this.game.input);
    if (ev === 'cancel') return this.finish();
    if (ev !== 'select') return;
    switch (COMMANDS[this.main.index]) {
      case 'Items':
        this.openItems();
        break;
      case 'Magic':
        this.beginPick('magic');
        break;
      case 'Equip':
        this.beginPick('equip');
        break;
      case 'Status':
        this.beginPick('status');
        break;
      case 'Save':
        void this.save();
        break;
      case 'Close':
        this.finish();
        break;
    }
  }

  private beginPick(purpose: Purpose): void {
    this.purpose = purpose;
    this.mode = 'pickMember';
  }

  private updatePickMember(): void {
    const input = this.game.input;
    if (input.pressed('cancel')) {
      audio.playSfx('cancel');
      this.mode = 'main';
      return;
    }
    if (input.repeat('down')) {
      this.member = (this.member + 1) % this.party.length;
      audio.playSfx('cursor');
    } else if (input.repeat('up')) {
      this.member = (this.member + this.party.length - 1) % this.party.length;
      audio.playSfx('cursor');
    } else if (input.pressed('confirm')) {
      audio.playSfx('confirm');
      if (this.purpose === 'status') this.mode = 'status';
      else if (this.purpose === 'equip') this.openEquipSlots();
      else this.openSpells();
    }
  }

  // ------------------------------------------------------------------ items

  private openItems(): void {
    this.refreshItems();
    this.itemMenu.index = 0;
    this.mode = 'items';
  }

  private refreshItems(): void {
    const entries = this.state.inventory.entries();
    this.itemIds = entries.map((e) => e.id);
    this.itemMenu.setItems(
      entries.map((e) => {
        const def = item(e.id);
        const usable = isConsumable(def) && def.usableInField;
        return { label: def.name, right: def.kind === 'key' ? '' : String(e.qty), enabled: usable, color: def.kind === 'key' ? COLOR_LABEL : undefined };
      }),
    );
  }

  private useItem(id: ItemId | undefined): void {
    if (!id) return;
    const def = item(id);
    if (!isConsumable(def)) return;
    this.startTargeting({
      target: def.target,
      effects: def.effects,
      caster: null,
      back: 'items',
      pay: () => {
        this.state.inventory.remove(id);
        this.refreshItems();
      },
      canRepeat: () => this.state.inventory.has(id),
    });
  }

  // ------------------------------------------------------------------ magic

  private openSpells(): void {
    this.refreshSpells();
    this.spellMenu.index = 0;
    this.mode = 'spells';
  }

  private refreshSpells(): void {
    const m = this.current;
    this.spells = m.spells().map(spell);
    this.spellMenu.setItems(
      this.spells.map((s) => ({ label: s.name, right: String(s.mp), enabled: s.usableInField && s.mp <= m.mp && m.alive })),
    );
  }

  private castSpell(sp: SpellDef | undefined): void {
    if (!sp) return;
    const caster = this.current;
    this.startTargeting({
      target: sp.target,
      effects: sp.effects,
      caster,
      back: 'spells',
      pay: () => {
        caster.mp -= sp.mp;
        this.refreshSpells();
      },
      canRepeat: () => caster.mp >= sp.mp,
    });
  }

  // ------------------------------------------------------------------ targeting (items & spells)

  private startTargeting(use: PendingUse): void {
    this.pending = use;
    this.targetIndex = Math.max(0, this.party.findIndex((m) => (use.target === 'deadAlly' ? !m.alive : m.alive)));
    this.mode = 'target';
  }

  private get targetsAll(): boolean {
    return this.pending?.target === 'allAllies';
  }

  private updateTarget(): void {
    const input = this.game.input;
    const use = this.pending!;
    if (input.pressed('cancel')) {
      audio.playSfx('cancel');
      this.mode = use.back;
      return;
    }
    if (!this.targetsAll) {
      if (input.repeat('down')) {
        this.targetIndex = (this.targetIndex + 1) % this.party.length;
        audio.playSfx('cursor');
      } else if (input.repeat('up')) {
        this.targetIndex = (this.targetIndex + this.party.length - 1) % this.party.length;
        audio.playSfx('cursor');
      }
    }
    if (!input.pressed('confirm')) return;
    const targets = this.targetsAll ? this.party.filter((m) => m.alive) : [this.party[this.targetIndex]];
    const user = new PartyCombatant(use.caster ?? targets[0] ?? this.party[0]);
    const outcomes: Outcome[] = [];
    for (const t of targets) for (const e of use.effects) outcomes.push(...applyEffect(user, new PartyCombatant(t), e, Math.random));
    const useful = outcomes.some((o) => (o.kind === 'heal' || o.kind === 'mp' ? o.amount > 0 : o.kind !== 'noEffect' && o.kind !== 'miss'));
    if (!useful) {
      audio.playSfx('buzzer');
      return;
    }
    audio.playSfx(outcomes.some((o) => o.kind === 'revive') ? 'revive' : 'heal');
    use.pay();
    // Stay on the target picker while it can be used again, like classic menus.
    if (!use.canRepeat()) this.mode = use.back;
  }

  // ------------------------------------------------------------------ equipment

  private openEquipSlots(): void {
    this.refreshSlots();
    this.slotMenu.index = 0;
    this.mode = 'equipSlots';
  }

  private refreshSlots(): void {
    const m = this.current;
    this.slotMenu.setItems(
      SLOTS.map((slot) => {
        const id = m.equipment[slot];
        return { label: slot === 'weapon' ? 'Weapon' : 'Armor', right: id ? item(id).name : '-' };
      }),
    );
  }

  private get selectedSlot(): EquipSlot {
    return SLOTS[this.slotMenu.index];
  }

  private openEquipList(): void {
    const m = this.current;
    const slot = this.selectedSlot;
    const candidates = this.state.inventory
      .entries()
      .map((e) => e.id)
      .filter((id) => {
        const def = item(id);
        return isEquipment(def) && def.slot === slot && m.canEquip(id);
      });
    this.equipIds = candidates;
    this.equipMenu.setItems(candidates.map((id) => ({ label: item(id).name, right: String(this.state.inventory.count(id)) })));
    if (candidates.length === 0) {
      audio.playSfx('buzzer');
      return;
    }
    this.equipMenu.index = 0;
    this.mode = 'equipList';
  }

  private equip(id: ItemId | null | undefined): void {
    if (!id) return;
    const m = this.current;
    const slot = this.selectedSlot;
    const old = m.equipment[slot];
    this.state.inventory.remove(id);
    if (old) this.state.inventory.add(old);
    m.equipment[slot] = id;
    m.hp = Math.min(m.hp, m.maxHp);
    m.mp = Math.min(m.mp, m.maxMp);
    this.refreshSlots();
    this.mode = 'equipSlots';
  }

  // ------------------------------------------------------------------ save

  private async save(): Promise<void> {
    if (!this.opts.canSave) return;
    if (saveGame(this.state)) {
      void audio.playJingle('save');
      await this.say('Your progress has been saved.');
    } else {
      audio.playSfx('buzzer');
      await this.say('Saving failed. (Is browser storage disabled?)');
    }
  }

  // ------------------------------------------------------------------ render

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    switch (this.mode) {
      case 'main':
      case 'pickMember':
        return this.renderMain(ctx);
      case 'items':
        return this.renderItems(ctx);
      case 'spells':
        return this.renderSpells(ctx);
      case 'target':
        if (this.pending?.back === 'items') this.renderItems(ctx);
        else this.renderSpells(ctx);
        return this.renderTargetPicker(ctx);
      case 'equipSlots':
      case 'equipList':
        return this.renderEquip(ctx);
      case 'status':
        return this.renderStatus(ctx);
    }
  }

  private renderMain(ctx: CanvasRenderingContext2D): void {
    const t = this.game.time;
    drawWindow(ctx, 0, 0, 188, SCREEN_H);
    this.party.forEach((m, i) => drawMemberCard(ctx, m, 12, CARD_Y0 + i * CARD_STEP, 164));
    drawWindow(ctx, 188, 0, 68, COMMANDS.length * 13 + 14);
    this.main.render(ctx, t, this.mode === 'main');

    const minutes = Math.floor(this.state.playTimeMs / 60000);
    const time = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
    drawWindow(ctx, 188, 164, 68, 60);
    drawText(ctx, 'Time', 196, 170, { color: COLOR_LABEL });
    drawTextRight(ctx, time, 248, 182);
    drawText(ctx, 'Gold', 196, 196, { color: COLOR_LABEL });
    drawTextRight(ctx, String(this.state.gold), 248, 208 - 2);

    drawWindow(ctx, 188, 104, 68, 56);
    drawText(ctx, 'Location', 196, 110, { color: COLOR_LABEL });
    wrapText(MAPS[this.state.location.map].name, 54)
      .slice(0, 2)
      .forEach((line, i) => drawText(ctx, line, 196, 124 + i * FONT_LINE_HEIGHT));

    if (this.mode === 'pickMember') {
      drawCursor(ctx, 10, CARD_Y0 + this.member * CARD_STEP + 16, t);
    }
  }

  private renderDescription(ctx: CanvasRenderingContext2D, text: string, title: string): void {
    drawWindow(ctx, 0, 0, SCREEN_W, 24);
    drawText(ctx, title, 8, 6, { color: COLOR_HIGHLIGHT });
    drawText(ctx, text, 52, 6);
  }

  private renderItems(ctx: CanvasRenderingContext2D): void {
    const id = this.itemIds[this.itemMenu.index];
    this.renderDescription(ctx, id ? item(id).description : '', 'Items');
    drawWindow(ctx, 0, 24, SCREEN_W, SCREEN_H - 24);
    if (this.itemIds.length === 0) drawText(ctx, 'No items.', 22, 34, { color: COLOR_DISABLED });
    this.itemMenu.render(ctx, this.game.time, this.mode === 'items');
  }

  private renderSpells(ctx: CanvasRenderingContext2D): void {
    const m = this.current;
    const sp = this.spells[this.spellMenu.index];
    this.renderDescription(ctx, sp ? sp.description : '', 'Magic');
    drawWindow(ctx, 0, 24, SCREEN_W, 22);
    drawText(ctx, m.name, 10, 29, { color: memberNameColor(m) });
    drawHpMp(ctx, 'MP', m.mp, m.maxMp, 150, 29, 246);
    drawWindow(ctx, 0, 46, SCREEN_W, SCREEN_H - 46);
    if (this.spells.length === 0) drawText(ctx, 'No abilities.', 22, 50, { color: COLOR_DISABLED });
    this.spellMenu.render(ctx, this.game.time, this.mode === 'spells');
    if (sp && !sp.usableInField) drawText(ctx, '(Battle only)', 22, 206, { color: COLOR_DISABLED });
  }

  private renderTargetPicker(ctx: CanvasRenderingContext2D): void {
    const x = 128;
    const y = 40;
    drawWindow(ctx, x, y, 124, this.party.length * 40 + 12);
    const t = this.game.time;
    this.party.forEach((m, i) => {
      const ey = y + 7 + i * 40;
      drawMemberCompact(ctx, m, x + 22, ey, 94);
      const show = this.targetsAll ? m.alive && Math.floor(t / 120) % 2 === 0 : i === this.targetIndex;
      if (show) drawCursor(ctx, x + 18, ey + 6, t, !this.targetsAll);
    });
  }

  private renderEquip(ctx: CanvasRenderingContext2D): void {
    const m = this.current;
    const t = this.game.time;
    drawWindow(ctx, 0, 0, SCREEN_W, 40);
    ctx.drawImage(getPortrait(m.id), 10, 8);
    drawText(ctx, m.name, 42, 8, { color: memberNameColor(m) });
    drawText(ctx, m.cls.job, 42, 20, { color: COLOR_LABEL });
    drawText(ctx, 'Equip', 210, 8, { color: COLOR_HIGHLIGHT });

    drawWindow(ctx, 0, 40, SCREEN_W, 44);
    this.slotMenu.render(ctx, t, this.mode === 'equipSlots');

    // Stats with a preview of the highlighted item.
    drawWindow(ctx, 0, 84, 120, SCREEN_H - 84);
    const previewId = this.mode === 'equipList' ? this.equipIds[this.equipMenu.index] : undefined;
    const now = { atk: m.atk, def: m.def, mag: m.mag, mdef: m.mdef };
    const next = previewId ? m.previewEquip(this.selectedSlot, previewId) : now;
    const rows: Array<[string, keyof typeof now]> = [
      ['ATK', 'atk'],
      ['DEF', 'def'],
      ['MAG', 'mag'],
      ['MDEF', 'mdef'],
    ];
    rows.forEach(([label, key], i) => {
      const y = 94 + i * 16;
      drawText(ctx, label, 10, y, { color: COLOR_LABEL });
      drawTextRight(ctx, String(now[key]), 64, y);
      if (previewId) {
        const v = next[key];
        const color = v > now[key] ? COLOR_GOOD : v < now[key] ? COLOR_BAD : COLOR_TEXT;
        drawText(ctx, '►', 70, y, { color: COLOR_LABEL });
        drawTextRight(ctx, String(v), 110, y, { color });
      }
    });
    const descId = previewId ?? m.equipment[this.selectedSlot];
    if (descId) {
      wrapText(item(descId).description, 100)
        .slice(0, 4)
        .forEach((l, i) => drawText(ctx, l, 10, 162 + i * FONT_LINE_HEIGHT, { color: COLOR_DISABLED }));
    }

    drawWindow(ctx, 120, 84, 136, SCREEN_H - 84);
    if (this.mode === 'equipList') this.equipMenu.render(ctx, t, true);
    else drawText(ctx, 'Choose a slot.', 132, 96, { color: COLOR_DISABLED });
  }

  private renderStatus(ctx: CanvasRenderingContext2D): void {
    const m = this.current;
    drawWindow(ctx, 0, 0, SCREEN_W, SCREEN_H);
    ctx.drawImage(getPortrait(m.id), 12, 12);
    drawText(ctx, m.name, 44, 12, { color: memberNameColor(m) });
    drawText(ctx, m.cls.job, 44, 24, { color: COLOR_LABEL });
    drawText(ctx, 'Level', 130, 12, { color: COLOR_LABEL });
    drawTextRight(ctx, String(m.level), 244, 12);
    drawText(ctx, 'EXP', 130, 24, { color: COLOR_LABEL });
    drawTextRight(ctx, String(m.xp), 244, 24);
    drawText(ctx, 'Next', 130, 36, { color: COLOR_LABEL });
    drawTextRight(ctx, String(m.xpToNext), 244, 36);

    drawHpMp(ctx, 'HP', m.hp, m.maxHp, 12, 52, 110);
    drawHpMp(ctx, 'MP', m.mp, m.maxMp, 12, 64, 110);

    const stats: Array<[string, number]> = [
      ['STR', m.str],
      ['ATK', m.atk],
      ['DEF', m.def],
      ['MAG', m.mag],
      ['MDEF', m.mdef],
      ['SPD', m.spd],
    ];
    stats.forEach(([label, v], i) => {
      const x = 12 + (i % 2) * 64;
      const y = 84 + Math.floor(i / 2) * 12;
      drawText(ctx, label, x, y, { color: COLOR_LABEL });
      drawTextRight(ctx, String(v), x + 50, y);
    });

    drawText(ctx, 'Equipment', 140, 58, { color: COLOR_HIGHLIGHT });
    SLOTS.forEach((slot, i) => {
      const id = m.equipment[slot];
      drawText(ctx, id ? item(id).name : '-', 140, 72 + i * 12);
    });

    drawText(ctx, m.cls.commandName === 'Skill' ? 'Skills' : 'Magic', 12, 128, { color: COLOR_HIGHLIGHT });
    m.spells().forEach((id, i) => {
      const x = 12 + (i % 3) * 80;
      const y = 142 + Math.floor(i / 3) * 12;
      drawText(ctx, spell(id).name, x, y);
    });
    const nextSpell = m.cls.learnset.find((l) => l.level > m.level);
    if (nextSpell) drawText(ctx, `Next: ${spell(nextSpell.spell).name} at Lv ${nextSpell.level}`, 12, 196, { color: COLOR_DISABLED });
    drawText(ctx, '◄ ►', 222, 206, { color: COLOR_DISABLED });
  }
}
