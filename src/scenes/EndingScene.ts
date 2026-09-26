import { audio } from '../audio/Audio';
import { SCREEN_H, SCREEN_W } from '../engine/constants';
import { drawTextCentered, FONT_LINE_HEIGHT } from '../engine/font';
import { Scene } from '../engine/Scene';
import type { GameState } from '../game/GameState';
import { getBattleSprite } from '../gfx/characters';
import { getFieldObjectSprite } from '../gfx/tiles';
import { COLOR_HIGHLIGHT, COLOR_LABEL } from '../ui/colors';
import { makeLogo } from '../ui/logo';
import { StarryBackdrop } from './backdrop';
import { TitleScene } from './TitleScene';

type Line = { text: string; color?: string } | null;

const CREDITS: Line[] = [
  { text: 'And so the light returned to Lumen.' },
  null,
  { text: 'The fields bloomed again at noon,' },
  { text: 'the seas grew calm,' },
  { text: 'and the lamps of Willowmere were' },
  { text: 'left unlit for many, many years.' },
  null,
  null,
  { text: 'Kael', color: COLOR_HIGHLIGHT },
  { text: 'returned to the watch, a little taller.' },
  null,
  { text: 'Lyra', color: COLOR_HIGHLIGHT },
  { text: 'relit every candle in the chapel.' },
  null,
  { text: 'Orrin', color: COLOR_HIGHLIGHT },
  { text: 'claimed it was "mostly his doing."' },
  null,
  { text: 'Pip got a scale. A shiny one.' },
  null,
  null,
  null,
  { text: '- MINIFANTASY -', color: COLOR_LABEL },
  { text: 'Echoes of the Heartstone', color: COLOR_LABEL },
  null,
  { text: 'Design, code, art & music', color: COLOR_LABEL },
  { text: 'generated with love, in code' },
  null,
  { text: 'Inspired by the 16-bit JRPGs', color: COLOR_LABEL },
  { text: 'we grew up with' },
  null,
  null,
  { text: 'Thank you for playing!' },
];

const SCROLL_SPEED = 14; // px per second

export class EndingScene extends Scene {
  private readonly backdrop = new StarryBackdrop([20, 24, 72], [240, 170, 120]);
  private readonly theEnd = makeLogo('The End', 3, ['#fff6c8', '#ffe070', '#f0b030', '#c87818']);
  private scroll = 0;
  private finished = false;
  private leaving = false;

  constructor(private readonly state: GameState) {
    super();
  }

  override onEnter(): void {
    audio.playMusic('ending');
  }

  private get creditsHeight(): number {
    return CREDITS.length * FONT_LINE_HEIGHT;
  }

  update(dt: number): void {
    const input = this.game.input;
    const speed = input.held('confirm') ? SCROLL_SPEED * 4 : SCROLL_SPEED;
    this.scroll += (dt / 1000) * speed;
    if (this.scroll > this.creditsHeight + SCREEN_H * 0.55) this.finished = true;
    if (this.finished && !this.leaving && input.pressed('confirm')) {
      this.leaving = true;
      void this.game.fadeOut(1500).then(() => this.game.replaceAll(new TitleScene()));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const t = this.game.time;
    this.backdrop.render(ctx, t);

    const stone = getFieldObjectSprite('heartstone_bright', t);
    ctx.drawImage(stone, 0, 0, stone.width, stone.height, 128 - stone.width, 150, stone.width * 2, stone.height * 2);
    const heroes = ['hero', 'cleric', 'mage'] as const;
    heroes.forEach((id, i) => {
      const alive = this.state.party[i]?.alive ?? true;
      const sprite = getBattleSprite(id, alive ? 'victory' : 'weak', Math.floor(t / 400));
      // Standing to the right of the Heartstone, facing it.
      ctx.drawImage(sprite, 150 + i * 24, 184);
    });

    if (!this.finished) {
      const baseY = SCREEN_H - this.scroll;
      CREDITS.forEach((line, i) => {
        if (!line) return;
        const y = Math.round(baseY + i * FONT_LINE_HEIGHT);
        if (y < -FONT_LINE_HEIGHT || y > SCREEN_H) return;
        // Fade near the top and bottom edges.
        const edge = Math.min(y / 30, (140 - y) / 30, 1);
        if (edge <= 0) return;
        ctx.globalAlpha = edge;
        drawTextCentered(ctx, line.text, SCREEN_W / 2, y, { color: line.color });
        ctx.globalAlpha = 1;
      });
    } else {
      ctx.drawImage(this.theEnd, Math.round((SCREEN_W - this.theEnd.width) / 2), 60);
      if (Math.floor(t / 600) % 2 === 0) drawTextCentered(ctx, 'Press Enter', SCREEN_W / 2, 110);
    }
  }
}
