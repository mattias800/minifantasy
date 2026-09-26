import { audio, type MusicId, type SfxId } from '../audio/Audio';
import type { EnemyId } from '../data/enemies';
import { item, type ItemId } from '../data/items';
import type { MapId } from '../data/maps/types';
import type { ShopId } from '../data/shops';
import type { Dir } from '../engine/direction';
import type { GameState } from '../game/GameState';
import { saveGame } from '../game/save';
import { EndingScene } from '../scenes/EndingScene';
import { ShopScene } from '../scenes/ShopScene';
import { MessageScene } from '../ui/MessageScene';
import { NPC_SPEED } from './Actor';
import type { FieldScene } from './FieldScene';
import type { BattleOptions, Script } from './Script';

/** Implements the map-script API on top of a FieldScene. */
export class FieldScriptApi implements Script {
  constructor(private readonly field: FieldScene) {}

  get state(): GameState {
    return this.field.state;
  }

  private get game() {
    return this.field.game;
  }

  async say(text: string, speaker?: string): Promise<void> {
    await this.game.run(new MessageScene(text, { speaker, position: this.field.messagePosition() }));
  }

  ask(text: string, choices: string[], speaker?: string): Promise<number> {
    return this.game.run(new MessageScene(text, { speaker, choices, position: this.field.messagePosition() }));
  }

  wait(ms: number): Promise<void> {
    return this.game.wait(ms);
  }

  async giveItem(id: ItemId, qty = 1, verb = 'Received'): Promise<void> {
    this.state.inventory.add(id, qty);
    const def = item(id);
    const name = qty > 1 ? `${def.name} x${qty}` : def.name;
    const jingle = audio.playJingle('item');
    await this.say(`${verb} ${name}!`);
    await jingle;
  }

  async giveGold(amount: number, verb = 'Received'): Promise<void> {
    this.state.gold += amount;
    audio.playSfx('confirm');
    await this.say(`${verb} ${amount} Gold!`);
  }

  healParty(): void {
    for (const m of this.state.party) m.restoreAll();
  }

  async inn(price: number): Promise<void> {
    const choice = await this.ask(`Welcome to the Sleepy Willow! A night's rest is ${price} Gold. Will you stay?`, ['Stay', 'Leave'], 'Innkeeper');
    if (choice !== 0) {
      await this.say('Come back anytime, dears.', 'Innkeeper');
      return;
    }
    if (this.state.gold < price) {
      audio.playSfx('buzzer');
      await this.say("Oh dear, you're a little short on coin...", 'Innkeeper');
      return;
    }
    this.state.gold -= price;
    await this.game.fadeOut(600);
    await audio.playJingle('inn');
    this.healParty();
    await this.game.fadeIn(600);
    await this.say('Good morning! You all look much better. Take care out there.', 'Innkeeper');
  }

  async shop(id: ShopId): Promise<void> {
    await this.game.run(new ShopScene(this.state, id));
  }

  async save(): Promise<void> {
    if (saveGame(this.state)) {
      void audio.playJingle('save');
      await this.say('Your progress has been saved.');
    } else {
      audio.playSfx('buzzer');
      await this.say('Saving failed. (Is browser storage disabled?)');
    }
  }

  async battle(enemies: EnemyId[], opts?: BattleOptions): Promise<boolean> {
    const result = await this.field.startBattle(enemies, opts);
    if (result === 'lose') return new Promise<boolean>(() => {}); // game over has taken over
    return result === 'win';
  }

  async walk(actorId: string, path: Dir[]): Promise<void> {
    const actor = this.field.findActor(actorId);
    if (!actor) return;
    for (const dir of path) await actor.step(dir, NPC_SPEED + 1);
  }

  face(actorId: string, dir: Dir): void {
    const actor = this.field.findActor(actorId);
    if (actor) actor.facing = dir;
  }

  hideNpc(id: string): void {
    this.field.setNpcVisible(id, false);
  }

  showNpc(id: string): void {
    this.field.setNpcVisible(id, true);
  }

  warp(map: MapId, x: number, y: number, facing: Dir): Promise<void> {
    return this.field.changeMap(map, x, y, facing);
  }

  playMusic(id: MusicId | null): void {
    if (id) audio.playMusic(id);
    else audio.stopMusic(600);
  }

  sfx(id: SfxId): void {
    audio.playSfx(id);
  }

  fadeOut(ms = 400): Promise<void> {
    return this.game.fadeOut(ms);
  }

  fadeIn(ms = 400): Promise<void> {
    return this.game.fadeIn(ms);
  }

  flash(color = '#fff', ms = 200): Promise<void> {
    return this.game.flash(color, ms);
  }

  shake(strength = 3, ms = 300): void {
    this.game.shake(strength, ms);
  }

  async ending(): Promise<void> {
    audio.stopMusic(1500);
    await this.game.fadeOut(2000, '#fff');
    this.game.replaceAll(new EndingScene(this.state));
    await this.game.fadeIn(1500);
  }
}
