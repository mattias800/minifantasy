import { audio } from '../audio/Audio';
import { SCREEN_W } from '../engine/constants';
import { drawTextCentered } from '../engine/font';
import { Scene } from '../engine/Scene';
import { hasSave, loadGame } from '../game/save';
import { FieldScene } from '../field/FieldScene';
import { COLOR_DISABLED } from '../ui/colors';
import { makeLogo } from '../ui/logo';
import { Menu } from '../ui/Menu';
import { TitleScene } from './TitleScene';

export class GameOverScene extends Scene {
  private readonly logo = makeLogo('Game Over', 3, ['#e8e8f8', '#b8b8d8', '#8888b0', '#606088'], '#000000');
  private readonly menu: Menu;
  private elapsed = 0;
  private leaving = false;

  constructor() {
    super();
    const canLoad = hasSave();
    this.menu = new Menu([{ label: 'Load last save', enabled: canLoad }, { label: 'Return to title' }], {
      x: 96,
      y: 150,
      width: 100,
      rows: 2,
    });
    this.menu.index = canLoad ? 0 : 1;
  }

  override onEnter(): void {
    audio.playMusic('gameover');
    void this.game.fadeIn(1200);
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed < 1500 || this.leaving) return;
    if (this.menu.update(this.game.input) !== 'select') return;
    this.leaving = true;
    void this.game.fadeOut(600).then(() => {
      const state = this.menu.index === 0 ? loadGame() : null;
      this.game.replaceAll(state ? new FieldScene(state) : new TitleScene());
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, 224);
    ctx.drawImage(this.logo, Math.round((SCREEN_W - this.logo.width) / 2), 60);
    drawTextCentered(ctx, 'The light fades... but hope endures.', 128, 110, { color: COLOR_DISABLED });
    if (this.elapsed >= 1500) this.menu.render(ctx, this.game.time);
  }
}
