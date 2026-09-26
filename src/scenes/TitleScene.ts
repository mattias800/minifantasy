import { audio } from '../audio/Audio';
import { SCREEN_W } from '../engine/constants';
import { drawTextCentered } from '../engine/font';
import { Scene } from '../engine/Scene';
import { FieldScene } from '../field/FieldScene';
import { GameState } from '../game/GameState';
import { hasSave, loadGame } from '../game/save';
import { getFieldObjectSprite } from '../gfx/tiles';
import { COLOR_DISABLED } from '../ui/colors';
import { makeLogo } from '../ui/logo';
import { Menu } from '../ui/Menu';
import { drawWindow } from '../ui/Window';
import { StarryBackdrop } from './backdrop';
import { IntroScene } from './IntroScene';

export class TitleScene extends Scene {
  private readonly backdrop = new StarryBackdrop();
  private readonly logo = makeLogo('Minifantasy', 3, ['#fff6c8', '#ffe070', '#f0b030', '#c87818']);
  private readonly subtitle = makeLogo('Echoes of the Heartstone', 1, ['#d8e8ff', '#a8c0f0'], '#10081c');
  private readonly menu: Menu;
  private leaving = false;

  constructor() {
    super();
    const canContinue = hasSave();
    this.menu = new Menu([{ label: 'New Game' }, { label: 'Continue', enabled: canContinue }], {
      x: 110,
      y: 150,
      width: 60,
      rows: 2,
    });
    if (canContinue) this.menu.index = 1;
  }

  override onEnter(): void {
    audio.playMusic('title');
    void this.game.fadeIn(800);
  }

  update(): void {
    if (this.leaving) return;
    if (this.menu.update(this.game.input) !== 'select') return;
    this.leaving = true;
    const loaded = this.menu.index === 1 ? loadGame() : null;
    void this.game.fadeOut(700).then(() => {
      if (loaded) this.game.replaceAll(new FieldScene(loaded));
      else this.game.replaceAll(new IntroScene(GameState.newGame()));
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const t = this.game.time;
    this.backdrop.render(ctx, t);

    // The Heartstone, gently floating, with a soft pulsing glow.
    const stone = getFieldObjectSprite('heartstone_bright', t);
    const bob = Math.round(Math.sin(t / 600) * 2);
    const glow = 0.1 + Math.sin(t / 500) * 0.04;
    ctx.fillStyle = `rgba(255,200,240,${glow})`;
    for (let r = 34; r > 6; r -= 7) {
      // Stacked translucent discs give a soft, banded halo.
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.floor(Math.sqrt(r * r - dy * dy));
        ctx.fillRect(128 - hw, 112 + dy + bob, hw * 2, 1);
      }
    }
    ctx.drawImage(stone, 0, 0, stone.width, stone.height, 128 - stone.width, 80 + bob, stone.width * 2, stone.height * 2);

    ctx.drawImage(this.logo, Math.round((SCREEN_W - this.logo.width) / 2), 22);
    ctx.drawImage(this.subtitle, Math.round((SCREEN_W - this.subtitle.width) / 2), 58);

    drawWindow(ctx, 88, 142, 80, 34);
    this.menu.render(ctx, t);
    drawTextCentered(ctx, 'A tiny tale  -  2026', 128, 206, { color: COLOR_DISABLED });
  }
}
