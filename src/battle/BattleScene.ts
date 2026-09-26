import { audio, type SfxId } from '../audio/Audio';
import { enemy as enemyDef, type EnemyAction, type EnemyId } from '../data/enemies';
import { isConsumable, item, type ConsumableDef, type ItemId } from '../data/items';
import { spell, type SpellDef } from '../data/spells';
import type { AnimId, Effect, TargetType } from '../data/types';
import { SCREEN_W } from '../engine/constants';
import { drawText, drawTextCentered, drawTextRight, FONT_LINE_HEIGHT } from '../engine/font';
import { easeOutQuad, pick } from '../engine/math';
import { Scene } from '../engine/Scene';
import type { GameState } from '../game/GameState';
import { getBattleBackground, type BattleBackgroundId } from '../gfx/backgrounds';
import { battlePoseFrameCount, getBattleSprite, type BattlePose } from '../gfx/characters';
import { getEnemySprite } from '../gfx/enemies';
import { silhouette } from '../gfx/pixelart';
import { COLOR_BAD, COLOR_DISABLED, COLOR_HEAL, COLOR_HIGHLIGHT, COLOR_TEXT } from '../ui/colors';
import { Menu } from '../ui/Menu';
import { MessageScene } from '../ui/MessageScene';
import { drawCursor, drawWindow } from '../ui/Window';
import { Combatant, EnemyCombatant, PartyCombatant } from './Combatant';
import { EffectLayer, type Point } from './effects';
import { applyEffect, atbRate, chooseEnemyAction, fleeChance, poisonDamage, type Outcome } from './rules';

export type BattleResult = 'win' | 'lose' | 'flee';

interface PartySlot {
  c: PartyCombatant;
  homeX: number;
  homeY: number;
  offsetX: number;
  /** Pose forced by an animation in progress. */
  pose: BattlePose | null;
  poseFrame: number;
  flipped: boolean;
}

interface EnemySlot {
  c: EnemyCombatant;
  x: number;
  y: number;
  sprite: HTMLCanvasElement;
  white: HTMLCanvasElement;
  purple: HTMLCanvasElement;
  flashUntil: number;
  shakeUntil: number;
  /** Death dissolve progress 0..1, or null while alive. */
  dying: number | null;
  flying: boolean;
}

type QueuedAction =
  | { kind: 'attack'; actor: PartyCombatant; target: Combatant }
  | { kind: 'spell'; actor: PartyCombatant; spell: SpellDef; targets: Combatant[] }
  | { kind: 'item'; actor: PartyCombatant; item: ConsumableDef; targets: Combatant[] }
  | { kind: 'defend'; actor: PartyCombatant }
  | { kind: 'flee'; actor: PartyCombatant }
  | { kind: 'enemy'; actor: EnemyCombatant; action: EnemyAction; targets: Combatant[] };

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
}

interface Targeting {
  type: TargetType;
  candidates: Combatant[];
  index: number;
  all: boolean;
  back: UiMode;
  confirm: (targets: Combatant[]) => void;
}

type UiMode = 'command' | 'spells' | 'items' | 'target';

const PARTY_HOME = [
  { x: 204, y: 86 },
  { x: 216, y: 112 },
  { x: 228, y: 138 },
];

const ENEMY_LAYOUTS: ReadonlyArray<ReadonlyArray<Point>> = [
  [{ x: 76, y: 134 }],
  [
    { x: 52, y: 112 },
    { x: 112, y: 138 },
  ],
  [
    { x: 44, y: 100 },
    { x: 110, y: 114 },
    { x: 62, y: 142 },
  ],
];

const UI_Y = 150;
const UI_H = 74;
const NUMBER_MS = 900;
const FLYING_ART = new Set(['bat', 'wisp']);

const ANIM_SFX: Record<AnimId, SfxId> = {
  slash: 'slash',
  claw: 'enemyAttack',
  bash: 'hit',
  bite: 'enemyAttack',
  fire: 'fire',
  ice: 'ice',
  bolt: 'bolt',
  holy: 'revive',
  quake: 'hit',
  nova: 'bolt',
  shadow: 'poison',
  heal: 'heal',
  revive: 'revive',
  buff: 'buff',
  cure: 'heal',
  poison: 'poison',
  ether: 'heal',
};

/** Side-view active-time battle, in "wait" mode: time pauses while a command menu is open. */
export class BattleScene extends Scene<BattleResult> {
  private readonly party: PartySlot[];
  private readonly enemies: EnemySlot[];
  private readonly background: HTMLCanvasElement;
  private readonly effects = new EffectLayer();
  private readonly numbers: FloatingText[] = [];
  private readonly queue: QueuedAction[] = [];
  private executing = false;
  private started = false;
  private ended = false;
  private victory = false;
  private caption: string | null = null;

  // command UI
  private active: PartySlot | null = null;
  private ui: UiMode = 'command';
  private readonly commandMenu = new Menu([], { x: 22, y: UI_Y + 7, width: 70, rows: 5, rowHeight: 12 });
  private readonly listMenu = new Menu([], { x: 22, y: UI_Y + 8, width: 226, rows: 5, columns: 2, rowHeight: 12, columnWidth: 118 });
  private listSpells: SpellDef[] = [];
  private listItems: ConsumableDef[] = [];
  private targeting: Targeting | null = null;

  constructor(
    private readonly state: GameState,
    enemyIds: EnemyId[],
    backgroundId: BattleBackgroundId,
    private readonly opts: { boss: boolean },
  ) {
    super();
    this.background = getBattleBackground(backgroundId);
    this.party = state.party.map((m, i) => ({
      c: new PartyCombatant(m),
      homeX: PARTY_HOME[i].x,
      homeY: PARTY_HOME[i].y,
      offsetX: 0,
      pose: null,
      poseFrame: 0,
      flipped: false,
    }));
    this.enemies = this.createEnemies(enemyIds);
  }

  private createEnemies(ids: EnemyId[]): EnemySlot[] {
    const layout = ENEMY_LAYOUTS[Math.min(ids.length, 3) - 1];
    const counts = new Map<EnemyId, number>();
    ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    const seen = new Map<EnemyId, number>();
    return ids.slice(0, 3).map((id, i) => {
      const def = enemyDef(id);
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      const name = (counts.get(id) ?? 0) > 1 ? `${def.name} ${String.fromCharCode(65 + n)}` : def.name;
      const sprite = getEnemySprite(def.art);
      return {
        c: new EnemyCombatant(def, name),
        x: layout[i].x,
        y: layout[i].y,
        sprite,
        white: silhouette(sprite, '#ffffff'),
        purple: silhouette(sprite, '#b048ff'),
        flashUntil: 0,
        shakeUntil: 0,
        dying: null,
        flying: FLYING_ART.has(def.art),
      };
    });
  }

  override onEnter(): void {
    audio.playMusic(this.opts.boss ? 'boss' : 'battle');
    // Give everyone a head start so the first turns come quickly.
    for (const p of this.party) p.c.atb = p.c.alive ? 0.3 + Math.random() * 0.4 : 0;
    for (const e of this.enemies) e.c.atb = Math.random() * 0.4;
    void this.game.fadeIn(350).then(() => (this.started = true));
  }

  // ------------------------------------------------------------------ helpers

  private get livingEnemies(): EnemySlot[] {
    return this.enemies.filter((e) => e.c.alive);
  }

  private slotOf(c: Combatant): PartySlot | EnemySlot {
    const p = this.party.find((s) => s.c === c);
    if (p) return p;
    return this.enemies.find((s) => s.c === c)!;
  }

  private isPartySlot(s: PartySlot | EnemySlot): s is PartySlot {
    return 'homeX' in s;
  }

  /** Centre point of a combatant, for effects and floating numbers. */
  private pointOf(c: Combatant): Point {
    const s = this.slotOf(c);
    if (this.isPartySlot(s)) return { x: s.homeX + s.offsetX, y: s.homeY - 14 };
    return { x: s.x, y: s.y - Math.floor(s.sprite.height / 2) };
  }

  private message(text: string): Promise<number> {
    return this.game.run(new MessageScene(text, { position: 'top' }));
  }

  private addNumber(c: Combatant, text: string, color: string, delayIndex = 0): void {
    const p = this.pointOf(c);
    this.numbers.push({ x: p.x, y: p.y + 4, text, color, age: -delayIndex * 60 });
  }

  // ------------------------------------------------------------------ main loop

  update(dt: number): void {
    this.effects.update(dt);
    for (const n of this.numbers) n.age += dt;
    for (let i = this.numbers.length - 1; i >= 0; i--) if (this.numbers[i].age > NUMBER_MS) this.numbers.splice(i, 1);
    for (const e of this.enemies) {
      if (e.dying !== null && e.dying < 1) e.dying = Math.min(1, e.dying + dt / (e.c.def_.boss ? 1800 : 550));
    }

    if (!this.started || this.ended || this.executing) return;
    if (this.active) {
      this.updateUi();
      return;
    }
    if (this.queue.length) {
      void this.executeNext();
      return;
    }
    const ready = this.party.find((p) => p.c.alive && p.c.atb >= 1);
    if (ready) {
      this.openCommands(ready);
      return;
    }
    this.tickAtb(dt);
  }

  private tickAtb(dt: number): void {
    for (const p of this.party) {
      if (p.c.alive) p.c.atb = Math.min(1, p.c.atb + atbRate(p.c.spd) * dt);
    }
    for (const e of this.livingEnemies) {
      if (e.c.atb >= 1) continue;
      e.c.atb += atbRate(e.c.spd) * dt;
      if (e.c.atb >= 1) {
        e.c.atb = 1;
        this.queueEnemyAction(e.c);
      }
    }
  }

  private queueEnemyAction(e: EnemyCombatant): void {
    const action = chooseEnemyAction(e, Math.random);
    const living = this.party.filter((p) => p.c.alive).map((p) => p.c);
    const targets = action.target === 'allEnemies' ? living : [pick(Math.random, living)];
    this.queue.push({ kind: 'enemy', actor: e, action, targets });
  }

  // ------------------------------------------------------------------ command UI

  private openCommands(slot: PartySlot): void {
    this.active = slot;
    slot.c.statuses.delete('defending');
    const m = slot.c.member;
    this.commandMenu.setItems([
      { label: 'Attack' },
      { label: m.cls.commandName, enabled: m.spells().length > 0 },
      { label: 'Item', enabled: this.battleItems().length > 0 },
      { label: 'Defend' },
      { label: 'Run', enabled: !this.opts.boss },
    ]);
    this.commandMenu.index = 0;
    this.ui = 'command';
    audio.playSfx('cursor');
    void this.game.tween(120, (t) => (slot.offsetX = -8 * t));
  }

  private closeCommands(): void {
    const slot = this.active;
    this.active = null;
    this.targeting = null;
    this.caption = null;
    if (slot) void this.game.tween(100, (t) => (slot.offsetX = -8 * (1 - t)));
  }

  private battleItems(): ConsumableDef[] {
    return this.state.inventory
      .entries()
      .map((e) => item(e.id))
      .filter(isConsumable);
  }

  private updateUi(): void {
    const input = this.game.input;
    const slot = this.active!;
    switch (this.ui) {
      case 'command': {
        const ev = this.commandMenu.update(input);
        if (ev !== 'select') return;
        switch (this.commandMenu.index) {
          case 0:
            this.beginTargeting('enemy', 'command', (t) => this.commit({ kind: 'attack', actor: slot.c, target: t[0] }));
            break;
          case 1:
            this.openSpellList(slot);
            break;
          case 2:
            this.openItemList();
            break;
          case 3:
            this.commit({ kind: 'defend', actor: slot.c });
            break;
          case 4:
            this.commit({ kind: 'flee', actor: slot.c });
            break;
        }
        return;
      }
      case 'spells': {
        const ev = this.listMenu.update(input);
        this.caption = this.listSpells[this.listMenu.index]?.description ?? null;
        if (ev === 'cancel') {
          this.ui = 'command';
          this.caption = null;
        } else if (ev === 'select') {
          const sp = this.listSpells[this.listMenu.index];
          this.beginTargeting(sp.target, 'spells', (t) => this.commit({ kind: 'spell', actor: slot.c, spell: sp, targets: t }));
        }
        return;
      }
      case 'items': {
        const ev = this.listMenu.update(input);
        this.caption = this.listItems[this.listMenu.index]?.description ?? null;
        if (ev === 'cancel') {
          this.ui = 'command';
          this.caption = null;
        } else if (ev === 'select') {
          const it = this.listItems[this.listMenu.index];
          this.beginTargeting(it.target, 'items', (t) => this.commit({ kind: 'item', actor: slot.c, item: it, targets: t }));
        }
        return;
      }
      case 'target':
        this.updateTargeting();
        return;
    }
  }

  private openSpellList(slot: PartySlot): void {
    const m = slot.c.member;
    this.listSpells = m.spells().map(spell);
    this.listMenu.setItems(
      this.listSpells.map((s) => ({ label: s.name, right: String(s.mp), enabled: s.mp <= m.mp })),
    );
    this.listMenu.index = 0;
    this.ui = 'spells';
  }

  private openItemList(): void {
    this.listItems = this.battleItems();
    this.listMenu.setItems(this.listItems.map((it) => ({ label: it.name, right: `${this.state.inventory.count(it.id)}` })));
    this.listMenu.index = 0;
    this.ui = 'items';
  }

  private beginTargeting(type: TargetType, back: UiMode, confirm: (targets: Combatant[]) => void): void {
    const actor = this.active!.c;
    let candidates: Combatant[];
    let index = 0;
    switch (type) {
      case 'self':
        confirm([actor]);
        return;
      case 'enemy':
      case 'allEnemies':
        candidates = this.livingEnemies.map((e) => e.c);
        break;
      case 'ally':
      case 'allAllies': {
        candidates = this.party.filter((p) => p.c.alive).map((p) => p.c);
        // Default to whoever is most hurt.
        let lowest = Infinity;
        candidates.forEach((c, i) => {
          if (c.hpFraction < lowest) {
            lowest = c.hpFraction;
            index = i;
          }
        });
        break;
      }
      case 'deadAlly':
        candidates = this.party.filter((p) => !p.c.alive).map((p) => p.c);
        break;
    }
    if (candidates.length === 0) {
      audio.playSfx('buzzer');
      return;
    }
    this.targeting = { type, candidates, index, all: type === 'allEnemies' || type === 'allAllies', back, confirm };
    this.ui = 'target';
  }

  private updateTargeting(): void {
    const t = this.targeting!;
    const input = this.game.input;
    if (input.pressed('cancel')) {
      audio.playSfx('cancel');
      this.targeting = null;
      this.ui = t.back;
      return;
    }
    if (input.pressed('confirm')) {
      audio.playSfx('confirm');
      t.confirm(t.all ? t.candidates : [t.candidates[t.index]]);
      return;
    }
    if (t.all) return;
    const n = t.candidates.length;
    if (input.repeat('up') || input.repeat('left')) t.index = (t.index + n - 1) % n;
    else if (input.repeat('down') || input.repeat('right')) t.index = (t.index + 1) % n;
    else return;
    audio.playSfx('cursor');
  }

  private commit(action: QueuedAction): void {
    this.queue.push(action);
    this.closeCommands();
  }

  // ------------------------------------------------------------------ action execution

  private async executeNext(): Promise<void> {
    this.executing = true;
    const action = this.queue.shift()!;
    const actor = action.actor;
    if (actor.alive) {
      if (actor.statuses.has('poison')) await this.poisonTick(actor);
      if (actor.alive) {
        switch (action.kind) {
          case 'attack':
            await this.doAttack(action.actor, action.target);
            break;
          case 'spell':
            await this.doSpell(action.actor, action.spell, action.targets);
            break;
          case 'item':
            await this.doItem(action.actor, action.item, action.targets);
            break;
          case 'defend':
            action.actor.statuses.add('defending');
            audio.playSfx('defend');
            this.addNumber(actor, 'Defend', '#9ad8ff');
            await this.game.wait(350);
            break;
          case 'flee':
            if (await this.doFlee()) return; // battle over
            break;
          case 'enemy':
            await this.doEnemyAction(action.actor, action.action, action.targets);
            break;
        }
      }
      actor.atb = 0;
    }
    if (await this.checkEnd()) return;
    this.executing = false;
  }

  private async poisonTick(c: Combatant): Promise<void> {
    const dmg = poisonDamage(c);
    c.hp = Math.max(0, c.hp - dmg);
    audio.playSfx('poison');
    this.addNumber(c, String(dmg), '#d890ff');
    await this.game.wait(450);
    this.afterDamage([{ kind: 'damage', target: c, amount: dmg, crit: false, weak: false }]);
  }

  /** Re-targets actions whose target has died since they were chosen. */
  private retarget(targets: Combatant[], wantDead = false): Combatant[] {
    if (wantDead) return targets;
    const alive = targets.filter((t) => t.alive);
    if (alive.length) return alive;
    const side: Combatant[] = targets[0]?.isEnemy
      ? this.livingEnemies.map((e) => e.c)
      : this.party.filter((p) => p.c.alive).map((p) => p.c);
    return side.length ? [pick(Math.random, side)] : [];
  }

  private async stepForward(slot: PartySlot): Promise<void> {
    slot.pose = 'walk';
    await this.game.tween(140, (t) => (slot.offsetX = -18 * easeOutQuad(t)));
  }

  private async stepBack(slot: PartySlot): Promise<void> {
    slot.pose = 'walk';
    await this.game.tween(140, (t) => (slot.offsetX = -18 * (1 - t)));
    slot.pose = null;
  }

  private async doAttack(actor: PartyCombatant, chosen: Combatant): Promise<void> {
    const [target] = this.retarget([chosen]);
    if (!target) return;
    const slot = this.slotOf(actor) as PartySlot;
    await this.stepForward(slot);
    slot.pose = 'attack';
    slot.poseFrame = 0;
    await this.game.wait(110);
    slot.poseFrame = 1;
    await this.playAndApply('slash', [target], () => applyEffect(actor, target, { kind: 'physical', multiplier: 1 }, Math.random), 0.4);
    await this.stepBack(slot);
  }

  private async doSpell(actor: PartyCombatant, sp: SpellDef, chosen: Combatant[]): Promise<void> {
    if (actor.mp < sp.mp) {
      this.addNumber(actor, 'No MP', COLOR_DISABLED);
      await this.game.wait(500);
      return;
    }
    const targets = this.resolveTargets(sp.target, chosen);
    if (!targets.length) return;
    actor.mp -= sp.mp;
    const slot = this.slotOf(actor) as PartySlot;
    const physical = sp.effects.some((e) => e.kind === 'physical');
    await this.stepForward(slot);
    this.caption = sp.name;
    if (physical) {
      slot.pose = 'attack';
      slot.poseFrame = 0;
      await this.game.wait(160);
      slot.poseFrame = 1;
    } else {
      slot.pose = 'cast';
      slot.poseFrame = 0;
      audio.playSfx('magicCharge');
      await this.game.wait(380);
      slot.poseFrame = 1;
    }
    await this.playAndApply(sp.anim, targets, () => this.applyAll(actor, targets, sp.effects), 0.55);
    this.caption = null;
    await this.stepBack(slot);
  }

  private async doItem(actor: PartyCombatant, it: ConsumableDef, chosen: Combatant[]): Promise<void> {
    if (!this.state.inventory.remove(it.id)) {
      this.addNumber(actor, 'None left', COLOR_DISABLED);
      await this.game.wait(500);
      return;
    }
    const targets = this.resolveTargets(it.target, chosen);
    const slot = this.slotOf(actor) as PartySlot;
    await this.stepForward(slot);
    this.caption = it.name;
    slot.pose = 'item';
    await this.game.wait(250);
    await this.playAndApply(it.anim, targets, () => this.applyAll(actor, targets, it.effects), 0.5);
    this.caption = null;
    await this.stepBack(slot);
  }

  private resolveTargets(type: TargetType, chosen: Combatant[]): Combatant[] {
    switch (type) {
      case 'allEnemies':
        return this.livingEnemies.map((e) => e.c);
      case 'allAllies':
        return this.party.filter((p) => p.c.alive).map((p) => p.c);
      case 'deadAlly':
        return chosen;
      default:
        return this.retarget(chosen);
    }
  }

  private applyAll(user: Combatant, targets: Combatant[], effects: Effect[]): Outcome[] {
    const outcomes: Outcome[] = [];
    for (const t of targets) for (const e of effects) outcomes.push(...applyEffect(user, t, e, Math.random));
    return outcomes;
  }

  private async doEnemyAction(actor: EnemyCombatant, action: EnemyAction, chosen: Combatant[]): Promise<void> {
    const targets = action.target === 'allEnemies' ? this.party.filter((p) => p.c.alive).map((p) => p.c) : this.retarget(chosen);
    if (!targets.length) return;
    const slot = this.slotOf(actor) as EnemySlot;
    if (action.name) this.caption = action.name;
    // The classic "enemy blinks before acting" cue.
    slot.flashUntil = this.game.time + 260;
    await this.game.wait(300);
    if (action.anim === 'quake') this.game.shake(3, 500);
    await this.playAndApply(action.anim, targets, () => this.applyAll(actor, targets, action.effects), 0.45);
    this.caption = null;
  }

  private async doFlee(): Promise<boolean> {
    const living = this.party.filter((p) => p.c.alive);
    const partySpd = living.reduce((s, p) => s + p.c.spd, 0) / Math.max(1, living.length);
    const enemies = this.livingEnemies;
    const enemySpd = enemies.reduce((s, e) => s + e.c.spd, 0) / Math.max(1, enemies.length);
    if (Math.random() < fleeChance(partySpd, enemySpd)) {
      this.ended = true;
      audio.playSfx('run');
      this.caption = 'Escaped!';
      for (const p of living) {
        p.flipped = true;
        p.pose = 'walk';
      }
      await this.game.tween(500, (t) => living.forEach((p) => (p.offsetX = t * 70)));
      await this.game.fadeOut(300);
      this.cleanupStatuses();
      this.finish('flee');
      return true;
    }
    audio.playSfx('buzzer');
    this.caption = "Couldn't escape!";
    await this.game.wait(700);
    this.caption = null;
    return false;
  }

  /** Plays an animation, applying its outcomes partway through (the "impact"). */
  private async playAndApply(anim: AnimId, targets: Combatant[], apply: () => Outcome[], impactAt: number): Promise<void> {
    audio.playSfx(ANIM_SFX[anim]);
    const done = this.effects.play(
      anim,
      targets.map((t) => this.pointOf(t)),
    );
    const duration = anim === 'slash' || anim === 'claw' || anim === 'bite' || anim === 'bash' ? 300 : 750;
    await this.game.wait(duration * impactAt);
    const outcomes = apply();
    this.showOutcomes(outcomes);
    await done;
    await this.game.wait(150);
    this.afterDamage(outcomes);
    await this.waitForDeaths();
  }

  private showOutcomes(outcomes: Outcome[]): void {
    outcomes.forEach((o, i) => {
      const t = o.target;
      switch (o.kind) {
        case 'damage': {
          audio.playSfx(o.crit ? 'critical' : 'hit');
          this.addNumber(t, String(o.amount), o.crit ? COLOR_HIGHLIGHT : COLOR_TEXT, i);
          if (o.crit) this.game.shake(2, 180);
          const slot = this.slotOf(t);
          if (this.isPartySlot(slot)) {
            if (!slot.pose) {
              slot.pose = 'hurt';
              void this.game.wait(320).then(() => {
                if (slot.pose === 'hurt') slot.pose = null;
              });
            }
          } else {
            slot.flashUntil = this.game.time + 160;
            slot.shakeUntil = this.game.time + 240;
          }
          break;
        }
        case 'heal':
          this.addNumber(t, String(o.amount), COLOR_HEAL, i);
          break;
        case 'mp':
          this.addNumber(t, `${o.amount} MP`, '#9ec8ff', i);
          break;
        case 'revive':
          this.addNumber(t, String(o.amount), COLOR_HEAL, i);
          break;
        case 'status': {
          const label = o.added ? { poison: 'Poison', barrier: 'Barrier', defending: 'Defend' }[o.status] : 'Cured';
          this.addNumber(t, label, o.status === 'poison' && o.added ? '#d890ff' : '#9ad8ff', i);
          break;
        }
        case 'miss':
          audio.playSfx('miss');
          this.addNumber(t, 'Miss', COLOR_TEXT, i);
          break;
        case 'noEffect':
          this.addNumber(t, 'No effect', COLOR_DISABLED, i);
          break;
      }
    });
  }

  /** Handles KOs after damage: enemy dissolves, party members fall. */
  private afterDamage(outcomes: Outcome[]): void {
    for (const o of outcomes) {
      if (o.kind !== 'damage' || o.target.alive) continue;
      const slot = this.slotOf(o.target);
      if (this.isPartySlot(slot)) {
        slot.c.statuses.clear();
        slot.c.atb = 0;
        slot.pose = null;
        // Drop any command they had queued.
        for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].actor === slot.c) this.queue.splice(i, 1);
      } else if (slot.dying === null) {
        slot.dying = 0;
        audio.playSfx(slot.c.def_.boss ? 'bossDie' : 'enemyDie');
        if (slot.c.def_.boss) this.game.shake(3, 1500);
        for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].actor === slot.c) this.queue.splice(i, 1);
      }
    }
  }

  private async waitForDeaths(): Promise<void> {
    while (this.enemies.some((e) => e.dying !== null && e.dying < 1)) await this.game.wait(50);
  }

  // ------------------------------------------------------------------ battle end

  private async checkEnd(): Promise<boolean> {
    if (this.livingEnemies.length === 0) {
      await this.win();
      return true;
    }
    if (this.party.every((p) => !p.c.alive)) {
      await this.lose();
      return true;
    }
    return false;
  }

  private cleanupStatuses(): void {
    for (const p of this.party) {
      p.c.statuses.delete('defending');
      p.c.statuses.delete('barrier');
    }
  }

  private async win(): Promise<void> {
    this.ended = true;
    this.victory = true;
    this.cleanupStatuses();
    audio.playMusic('victory');
    await this.game.wait(700);

    const defs = this.enemies.map((e) => e.c.def_);
    const xp = defs.reduce((s, d) => s + d.xp, 0);
    const gold = defs.reduce((s, d) => s + d.gold, 0);
    const drops: ItemId[] = defs.filter((d) => d.drop && Math.random() < d.drop.chance).map((d) => d.drop!.item);

    this.state.gold += gold;
    await this.message(xp > 0 ? `Victory! Gained ${xp} EXP and ${gold} Gold.` : 'Victory!');
    for (const id of drops) {
      this.state.inventory.add(id);
      await this.message(`Found ${item(id).name}!`);
    }
    let fanfarePlayed = false;
    for (const p of this.party) {
      if (!p.c.alive) continue;
      for (const up of p.c.member.gainXp(xp)) {
        if (!fanfarePlayed) void audio.playJingle('levelup');
        fanfarePlayed = true;
        await this.message(`${p.c.name} reached level ${up.level}!`);
        for (const s of up.learned) await this.message(`${p.c.name} learned ${spell(s).name}!`);
      }
    }
    await this.game.fadeOut(400);
    this.finish('win');
  }

  private async lose(): Promise<void> {
    this.ended = true;
    audio.stopMusic(800);
    await this.game.wait(700);
    await this.message('The party has fallen...');
    await this.game.fadeOut(1000);
    this.finish('lose');
  }

  // ------------------------------------------------------------------ rendering

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.background, 0, 0);
    this.renderEnemies(ctx);
    this.renderParty(ctx);
    this.effects.render(ctx);
    this.renderNumbers(ctx);
    this.renderUi(ctx);
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    const t = this.game.time;
    for (const [i, e] of this.enemies.entries()) {
      if (e.dying === 1) continue;
      const bob = e.flying ? Math.round(Math.sin(t / 250 + i) * 2) - 2 : 0;
      const shake = t < e.shakeUntil ? (Math.floor(t / 40) % 2 ? 2 : -2) : 0;
      const x = Math.round(e.x - e.sprite.width / 2) + shake;
      const y = e.y - e.sprite.height + bob;
      if (e.dying !== null) {
        this.renderDissolve(ctx, e, x, y, e.dying);
        continue;
      }
      const flashing = t < e.flashUntil && Math.floor(t / 50) % 2 === 0;
      ctx.drawImage(flashing ? e.white : e.sprite, x, y);
    }
  }

  /** Classic enemy death: tinted purple, then crumbling away row by row. */
  private renderDissolve(ctx: CanvasRenderingContext2D, e: EnemySlot, x: number, y: number, p: number): void {
    const h = e.sprite.height;
    const w = e.sprite.width;
    const boss = e.c.def_.boss;
    const src = boss && Math.floor(this.game.time / 70) % 2 === 0 ? e.white : e.purple;
    for (let row = 0; row < h; row++) {
      const threshold = ((Math.sin(row * 12.9898) * 43758.5453) % 1 + 1) % 1;
      if (threshold < p * 1.15 - 0.1) continue;
      ctx.globalAlpha = Math.max(0, 1 - p * 0.6);
      ctx.drawImage(p < 0.15 ? e.sprite : src, 0, row, w, 1, x, y + row, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  private partyPose(slot: PartySlot): { pose: BattlePose; frame: number } {
    const t = this.game.time;
    const c = slot.c;
    let pose: BattlePose;
    if (slot.pose && c.alive) pose = slot.pose;
    else if (!c.alive) pose = 'dead';
    else if (this.victory) pose = 'victory';
    else if (c.statuses.has('defending')) pose = 'defend';
    else if (c.hpFraction < 0.25) pose = 'weak';
    else pose = 'idle';
    const explicit = pose === 'attack' || pose === 'cast';
    const frame = explicit ? slot.poseFrame : Math.floor(t / (pose === 'walk' ? 120 : 300)) % battlePoseFrameCount(pose);
    return { pose, frame };
  }

  private renderParty(ctx: CanvasRenderingContext2D): void {
    for (const slot of this.party) {
      const { pose, frame } = this.partyPose(slot);
      const sprite = getBattleSprite(slot.c.member.id, pose, frame);
      const x = Math.round(slot.homeX + slot.offsetX - 16);
      const y = slot.homeY - 32;
      if (slot.flipped) {
        ctx.save();
        ctx.translate(x + 32, y);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, x, y);
      }
      if (slot.c.statuses.has('barrier') && slot.c.alive && Math.floor(this.game.time / 120) % 6 === 0) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#9ad8ff';
        ctx.fillRect(x + 8, y + 6, 16, 26);
        ctx.globalAlpha = 1;
      }
    }
  }

  private renderNumbers(ctx: CanvasRenderingContext2D): void {
    for (const n of this.numbers) {
      if (n.age < 0) continue;
      // Quick bounce, then hold.
      const a = n.age / 260;
      const bounce = a < 1 ? Math.sin(a * Math.PI) * 10 : a < 1.5 ? Math.sin((a - 1) * 2 * Math.PI) * 3 : 0;
      drawTextCentered(ctx, n.text, n.x, Math.round(n.y - 10 - Math.max(0, bounce)), { color: n.color, shadow: '#000000' });
    }
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const t = this.game.time;
    // Enemy names
    drawWindow(ctx, 0, UI_Y, 96, UI_H);
    this.livingEnemies.forEach((e, i) => drawText(ctx, e.c.name, 8, UI_Y + 8 + i * 14));

    // Party status
    drawWindow(ctx, 96, UI_Y, 160, UI_H);
    this.party.forEach((p, i) => {
      const y = UI_Y + 9 + i * 20;
      const c = p.c;
      const nameColor = !c.alive ? COLOR_BAD : this.active === p ? COLOR_HIGHLIGHT : c.statuses.has('poison') ? '#d890ff' : COLOR_TEXT;
      const hpColor = !c.alive ? COLOR_BAD : c.hpFraction < 0.25 ? COLOR_HIGHLIGHT : COLOR_TEXT;
      drawText(ctx, c.name, 104, y, { color: nameColor });
      drawTextRight(ctx, `${c.hp}/${c.maxHp}`, 188, y, { color: hpColor });
      drawTextRight(ctx, String(c.mp), 212, y, { color: '#9ec8ff' });
      this.renderGauge(ctx, 218, y + 3, 30, c);
    });

    // Command menus
    if (this.active) {
      if (this.ui === 'command' || (this.ui === 'target' && this.targeting?.back === 'command')) {
        drawWindow(ctx, 0, UI_Y, 96, UI_H);
        this.commandMenu.render(ctx, t, this.ui === 'command');
      } else if (this.ui === 'spells' || this.ui === 'items' || this.targeting) {
        drawWindow(ctx, 0, UI_Y, SCREEN_W, UI_H);
        this.listMenu.render(ctx, t, this.ui !== 'target');
      }
      if (this.targeting) this.renderTargetCursor(ctx, this.targeting);
    }

    if (this.caption) {
      const w = Math.min(SCREEN_W - 16, Math.max(80, this.caption.length * 6 + 24));
      drawWindow(ctx, 128 - w / 2, 6, w, FONT_LINE_HEIGHT + 10);
      drawTextCentered(ctx, this.caption, 128, 11);
    }
  }

  private renderGauge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, c: Combatant): void {
    ctx.fillStyle = '#101030';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#303868';
    ctx.fillRect(x, y, w, 4);
    if (!c.alive) return;
    const full = c.atb >= 1;
    const flash = full && Math.floor(this.game.time / 150) % 2 === 0;
    ctx.fillStyle = full ? (flash ? '#fff8a0' : '#ffd040') : '#f0f0ff';
    ctx.fillRect(x, y, Math.round(w * Math.min(1, c.atb)), 4);
  }

  private renderTargetCursor(ctx: CanvasRenderingContext2D, tg: Targeting): void {
    const t = this.game.time;
    const show = tg.all ? tg.candidates : [tg.candidates[tg.index]];
    if (tg.all && Math.floor(t / 120) % 2 === 1) return;
    for (const c of show) {
      const slot = this.slotOf(c);
      let x: number;
      let y: number;
      if (this.isPartySlot(slot)) {
        x = slot.homeX + slot.offsetX - 8;
        y = slot.homeY - 14;
      } else {
        x = slot.x - Math.floor(slot.sprite.width / 2) + 2;
        y = slot.y - Math.floor(slot.sprite.height / 2);
      }
      drawCursor(ctx, x, y, t, !tg.all);
    }
    const target = tg.all ? (tg.candidates[0].isEnemy ? 'All enemies' : 'All allies') : tg.candidates[tg.index].name;
    if (!this.caption || this.ui === 'target') {
      const w = Math.max(80, target.length * 6 + 24);
      drawWindow(ctx, 128 - w / 2, 6, w, FONT_LINE_HEIGHT + 10);
      drawTextCentered(ctx, target, 128, 11);
    }
  }
}
