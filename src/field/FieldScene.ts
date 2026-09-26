import { audio } from '../audio/Audio';
import type { EnemyId } from '../data/enemies';
import { MAPS, type MapId } from '../data/maps';
import type { ChestDef, EncounterTable, NpcDef, ObjectDef, ScriptFn } from '../data/maps/types';
import { TILE } from '../engine/constants';
import { ALL_DIRS, DIR_DELTA, OPPOSITE, type Dir } from '../engine/direction';
import { drawTextCentered } from '../engine/font';
import { weightedPick } from '../engine/math';
import { Scene } from '../engine/Scene';
import { BattleScene, type BattleResult } from '../battle/BattleScene';
import type { GameState } from '../game/GameState';
import type { BattleBackgroundId } from '../gfx/backgrounds';
import { getEnemySprite } from '../gfx/enemies';
import { getFieldObjectSprite } from '../gfx/tiles';
import { GameOverScene } from '../scenes/GameOverScene';
import { MenuScene } from '../scenes/menu/MenuScene';
import { TransitionScene } from '../scenes/TransitionScene';
import { drawWindow } from '../ui/Window';
import { Actor, DASH_SPEED, NPC_SPEED, WALK_SPEED } from './Actor';
import { FieldMap } from './FieldMap';
import { FieldScriptApi } from './FieldScriptApi';
import type { BattleOptions, Script } from './Script';

interface NpcRuntime {
  def: NpcDef;
  actor: Actor;
  /** Script override of the NPC's visibility (null = use the def's condition). */
  forcedVisible: boolean | null;
  wanderIn: number;
}

const BANNER_MS = 2200;

/** Map exploration: walking, talking, chests, warps, random encounters and scripted events. */
export class FieldScene extends Scene {
  map!: FieldMap;
  player!: Actor;
  readonly npcs = new Map<string, NpcRuntime>();
  private scriptDepth = 0;
  private encounterCounter = 0;
  private bannerTime = 0;
  private readonly api: FieldScriptApi;

  constructor(readonly state: GameState) {
    super();
    this.api = new FieldScriptApi(this);
  }

  override onEnter(): void {
    const { map, x, y, facing } = this.state.location;
    this.loadMap(map, x, y, facing);
    void this.game.fadeIn(400);
    this.runMapEnterScript();
  }

  override onResume(): void {
    audio.playMusic(this.map.def.music);
  }

  get busy(): boolean {
    return this.scriptDepth > 0;
  }

  // ------------------------------------------------------------------ map loading

  private loadMap(id: MapId, x: number, y: number, facing: Dir): void {
    const def = MAPS[id];
    this.map = new FieldMap(def);
    this.state.location = { map: id, x, y, facing };
    this.player = new Actor(this.leaderSprite(), x, y, facing);
    this.npcs.clear();
    for (const n of def.npcs ?? []) {
      this.npcs.set(n.id, {
        def: n,
        actor: new Actor(n.sprite, n.x, n.y, n.facing ?? 'down'),
        forcedVisible: null,
        wanderIn: 1000 + Math.random() * 2000,
      });
    }
    this.resetEncounterCounter();
    this.bannerTime = ['overworld', 'town', 'cave1', 'cave2'].includes(id) ? BANNER_MS : 0;
    audio.playMusic(def.music);
  }

  private runMapEnterScript(): void {
    const onEnter = this.map.def.onEnter;
    if (onEnter) void this.runScript(onEnter);
  }

  /** Fades out, switches map and fades back in. */
  async changeMap(id: MapId, x: number, y: number, facing: Dir): Promise<void> {
    this.scriptDepth++;
    await this.game.fadeOut(220);
    this.loadMap(id, x, y, facing);
    await this.game.fadeIn(220);
    this.scriptDepth--;
    this.runMapEnterScript();
  }

  private leaderSprite(): 'hero' | 'cleric' | 'mage' {
    return (this.state.party.find((m) => m.alive) ?? this.state.party[0]).id;
  }

  // ------------------------------------------------------------------ scripts

  async runScript(fn: ScriptFn): Promise<void> {
    this.scriptDepth++;
    try {
      await fn(this.api);
    } catch (err) {
      console.error('Script error', err);
    } finally {
      this.scriptDepth--;
    }
  }

  findActor(id: string): Actor | undefined {
    return id === 'player' ? this.player : this.npcs.get(id)?.actor;
  }

  setNpcVisible(id: string, visible: boolean): void {
    const npc = this.npcs.get(id);
    if (npc) npc.forcedVisible = visible;
  }

  private npcVisible(n: NpcRuntime): boolean {
    return n.forcedVisible ?? n.def.visible?.(this.state) ?? true;
  }

  private objectVisible(o: ObjectDef): boolean {
    return o.visible?.(this.state) ?? true;
  }

  // ------------------------------------------------------------------ battles

  async startBattle(enemies: EnemyId[], opts: BattleOptions = {}): Promise<BattleResult> {
    this.scriptDepth++;
    audio.playSfx('encounter');
    audio.stopMusic(200);
    await this.game.run(new TransitionScene(this.game.canvas));
    const background = opts.background ?? this.battleBackground();
    const result = await this.game.run(new BattleScene(this.state, enemies, background, { boss: !!opts.boss }));
    this.scriptDepth--;
    if (result === 'lose') {
      this.game.replaceAll(new GameOverScene());
      return result;
    }
    this.player.sprite = this.leaderSprite();
    audio.playMusic(this.map.def.music);
    await this.game.fadeIn(300);
    return result;
  }

  private battleBackground(): BattleBackgroundId {
    if (this.map.def.battleBackground) return this.map.def.battleBackground;
    return this.map.tileAt(this.player.x, this.player.y) === 'forest' ? 'forest' : 'plains';
  }

  private resetEncounterCounter(): void {
    const table = this.encounterTable();
    this.encounterCounter = table ? table.steps * (0.6 + Math.random() * 0.8) : Infinity;
  }

  private encounterTable(): EncounterTable | undefined {
    const { x, y } = this.player;
    return this.map.def.encounters?.find(
      (t) => !t.region || (x >= t.region.x0 && x <= t.region.x1 && y >= t.region.y0 && y <= t.region.y1),
    );
  }

  /** Returns true if a battle was started. */
  private checkEncounter(): boolean {
    const table = this.encounterTable();
    if (!table) return false;
    if (!Number.isFinite(this.encounterCounter)) this.resetEncounterCounter();
    this.encounterCounter -= this.map.props(this.player.x, this.player.y).encounter;
    if (this.encounterCounter > 0) return false;
    this.resetEncounterCounter();
    const formation = weightedPick(Math.random, table.formations);
    void this.startBattle(formation.enemies);
    return true;
  }

  // ------------------------------------------------------------------ collision

  private chestAt(x: number, y: number): ChestDef | undefined {
    return this.map.def.chests?.find((c) => c.x === x && c.y === y);
  }

  private objectAt(x: number, y: number): ObjectDef | undefined {
    return this.map.def.objects?.find((o) => o.x === x && o.y === y && this.objectVisible(o));
  }

  private npcAt(x: number, y: number): NpcRuntime | undefined {
    for (const n of this.npcs.values()) if (this.npcVisible(n) && n.actor.x === x && n.actor.y === y) return n;
    return undefined;
  }

  private isBlocked(x: number, y: number, ignorePlayer = false): boolean {
    if (!this.map.inBounds(x, y)) return true;
    if (!this.map.props(x, y).walkable) return true;
    if (this.chestAt(x, y) || this.objectAt(x, y) || this.npcAt(x, y)) return true;
    return !ignorePlayer && this.player.x === x && this.player.y === y;
  }

  chestOpened(c: ChestDef): boolean {
    return this.state.hasFlag(`chest:${this.map.def.id}:${c.id}`);
  }

  // ------------------------------------------------------------------ update

  update(dt: number): void {
    this.state.playTimeMs += dt;
    if (this.bannerTime > 0) this.bannerTime -= dt;
    this.updateNpcs(dt);
    const arrived = this.player.update(dt);
    if (this.busy) return;
    if (arrived && this.onPlayerArrived()) return;
    if (this.player.moving) return;
    this.handleInput();
  }

  private updateNpcs(dt: number): void {
    for (const n of this.npcs.values()) {
      n.actor.update(dt);
      if (this.busy || !n.def.wander || n.actor.moving || !this.npcVisible(n)) continue;
      n.wanderIn -= dt;
      if (n.wanderIn > 0) continue;
      n.wanderIn = 1500 + Math.random() * 2500;
      const dir = ALL_DIRS[Math.floor(Math.random() * 4)];
      const tx = n.actor.x + DIR_DELTA[dir].dx;
      const ty = n.actor.y + DIR_DELTA[dir].dy;
      const nearHome = Math.abs(tx - n.def.x) <= 2 && Math.abs(ty - n.def.y) <= 2;
      if (nearHome && !this.isBlocked(tx, ty) && !this.isWarpTile(tx, ty)) void n.actor.step(dir, NPC_SPEED);
      else n.actor.facing = dir;
    }
  }

  private isWarpTile(x: number, y: number): boolean {
    return !!this.map.def.warps?.some((w) => w.x === x && w.y === y);
  }

  private handleInput(): void {
    const input = this.game.input;
    if (input.pressed('cancel') || input.pressed('menu')) {
      audio.playSfx('confirm');
      void this.game.run(new MenuScene(this.state, { canSave: !!this.map.def.canSave }));
      return;
    }
    if (input.pressed('confirm')) {
      this.interact();
      return;
    }
    const dir = input.direction();
    if (dir) this.tryMove(dir, input.held('dash') ? DASH_SPEED : WALK_SPEED);
  }

  private tryMove(dir: Dir, speed: number): void {
    const p = this.player;
    p.facing = dir;
    const tx = p.x + DIR_DELTA[dir].dx;
    const ty = p.y + DIR_DELTA[dir].dy;
    const exit = this.map.def.exit;
    if (!this.map.inBounds(tx, ty) && exit) {
      void this.changeMap(exit.to, exit.tx, exit.ty, exit.facing);
      return;
    }
    if (this.isBlocked(tx, ty, true)) return;
    void p.step(dir, speed);
  }

  /** Handles warps, triggers and encounters. Returns true if something took over. */
  private onPlayerArrived(): boolean {
    const { x, y } = this.player;
    this.state.location = { map: this.map.def.id, x, y, facing: this.player.facing };
    audio.playSfx('step');

    const warp = this.map.def.warps?.find((w) => w.x === x && w.y === y);
    if (warp) {
      if (warp.when && !warp.when(this.state)) {
        if (warp.blocked) void this.runScript(warp.blocked);
        return true;
      }
      if (warp.sfx) audio.playSfx(warp.sfx);
      void this.changeMap(warp.to, warp.tx, warp.ty, warp.facing);
      return true;
    }

    const trigger = this.map.def.triggers?.find(
      (t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1) && (t.when?.(this.state) ?? true),
    );
    if (trigger) {
      void this.runScript(trigger.run);
      return true;
    }

    return this.checkEncounter();
  }

  private interact(): void {
    const p = this.player;
    let fx = p.x + DIR_DELTA[p.facing].dx;
    let fy = p.y + DIR_DELTA[p.facing].dy;
    // Talk across shop counters.
    if (this.map.props(fx, fy).counter) {
      fx += DIR_DELTA[p.facing].dx;
      fy += DIR_DELTA[p.facing].dy;
    }

    const npc = this.npcAt(fx, fy);
    if (npc?.def.talk) {
      npc.actor.facing = OPPOSITE[p.facing];
      const talk = npc.def.talk;
      void this.runScript(async (s) => {
        await talk(s);
        npc.actor.facing = npc.def.facing ?? 'down';
      });
      return;
    }

    const chest = this.chestAt(fx, fy);
    if (chest) {
      void this.runScript((s) => this.openChest(chest, s));
      return;
    }

    const obj = this.objectAt(fx, fy);
    if (obj?.talk) {
      void this.runScript(obj.talk);
      return;
    }

    const spot = this.map.def.inspect?.find((i) => i.x === fx && i.y === fy);
    if (spot) void this.runScript(spot.run);
  }

  private async openChest(chest: ChestDef, s: Script): Promise<void> {
    if (this.chestOpened(chest)) {
      await s.say('The chest is empty.');
      return;
    }
    this.state.setFlag(`chest:${this.map.def.id}:${chest.id}`);
    audio.playSfx('chest');
    await this.game.wait(250);
    if (chest.item) await s.giveItem(chest.item, chest.qty ?? 1, 'Found');
    if (chest.gold) await s.giveGold(chest.gold, 'Found');
  }

  // ------------------------------------------------------------------ render

  render(ctx: CanvasRenderingContext2D): void {
    const cam = this.map.cameraFor(this.player.px, this.player.py);
    const t = this.game.time;
    this.map.render(ctx, cam.x, cam.y, t);

    // Depth-sort everything standing on the map by its bottom edge.
    const drawables: Array<{ y: number; draw: () => void }> = [];
    for (const c of this.map.def.chests ?? []) {
      const sprite = getFieldObjectSprite(this.chestOpened(c) ? 'chest_open' : 'chest_closed', t);
      drawables.push({ y: c.y * TILE, draw: () => ctx.drawImage(sprite, c.x * TILE - cam.x, c.y * TILE - cam.y) });
    }
    for (const o of this.map.def.objects ?? []) {
      if (!this.objectVisible(o)) continue;
      drawables.push({ y: o.y * TILE + (o.kind === 'monster' ? 1 : 0), draw: () => this.drawObject(ctx, o, cam.x, cam.y) });
    }
    for (const n of this.npcs.values()) {
      if (!this.npcVisible(n)) continue;
      drawables.push({ y: n.actor.py, draw: () => n.actor.render(ctx, cam.x, cam.y) });
    }
    drawables.push({ y: this.player.py + 0.5, draw: () => this.player.render(ctx, cam.x, cam.y) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    this.renderBanner(ctx);
  }

  private drawObject(ctx: CanvasRenderingContext2D, o: ObjectDef, camX: number, camY: number): void {
    const t = this.game.time;
    const bottom = (o.y + 1) * TILE - camY;
    const centerX = o.x * TILE + TILE / 2 - camX;
    let sprite: HTMLCanvasElement;
    let bob = 0;
    switch (o.kind) {
      case 'save_crystal':
        sprite = getFieldObjectSprite('save_crystal', t);
        break;
      case 'heartstone':
        sprite = getFieldObjectSprite(this.state.hasFlag('heartstone_restored') ? 'heartstone_bright' : 'heartstone_dim', t);
        break;
      case 'monster':
        sprite = getEnemySprite(o.art ?? 'troll');
        bob = Math.round(Math.sin(t / 400) * 1.5);
        break;
    }
    ctx.drawImage(sprite, Math.round(centerX - sprite.width / 2), bottom - sprite.height + bob);
  }

  private renderBanner(ctx: CanvasRenderingContext2D): void {
    if (this.bannerTime <= 0) return;
    const alpha = Math.min(1, this.bannerTime / 400, (BANNER_MS - this.bannerTime) / 300);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const w = 140;
    drawWindow(ctx, 128 - w / 2, 12, w, 22);
    drawTextCentered(ctx, this.map.def.name, 128, 17);
    ctx.restore();
  }

  /** Dialogue goes at the top when the leader stands in the lower part of the screen, so it never hides them. */
  messagePosition(): 'top' | 'bottom' {
    const cam = this.map.cameraFor(this.player.px, this.player.py);
    return this.player.py - cam.y > 120 ? 'top' : 'bottom';
  }
}
