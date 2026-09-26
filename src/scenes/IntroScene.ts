import { SCREEN_H, SCREEN_W } from '../engine/constants';
import { drawTextCentered, FONT_LINE_HEIGHT, wrapText } from '../engine/font';
import { Scene } from '../engine/Scene';
import { FieldScene } from '../field/FieldScene';
import type { GameState } from '../game/GameState';
import { COLOR_DISABLED } from '../ui/colors';

const PARAGRAPHS = [
  'Long ago, a star fell from the heavens and came to rest beneath the isle of Lumen.',
  'The people named it the Heartstone. Its light warmed the fields, calmed the seas, and kept the darkness sleeping.',
  'For a thousand years, Lumen knew peace.',
  'But now the Heartstone grows dim... and deep below the mountains, something ancient stirs.',
];

const FADE_MS = 700;
const HOLD_MS = 3200;

/** The opening narration: paragraphs fading in and out over black. */
export class IntroScene extends Scene {
  private index = 0;
  private elapsed = 0;
  private leaving = false;

  constructor(private readonly state: GameState) {
    super();
  }

  override onEnter(): void {
    void this.game.fadeIn(10);
  }

  update(dt: number): void {
    if (this.leaving) return;
    this.elapsed += dt;
    const input = this.game.input;
    if (input.pressed('cancel')) return this.leave();
    if (input.pressed('confirm') && this.elapsed > FADE_MS) this.elapsed = FADE_MS * 2 + HOLD_MS;
    if (this.elapsed >= FADE_MS * 2 + HOLD_MS) {
      this.elapsed = 0;
      this.index++;
      if (this.index >= PARAGRAPHS.length) this.leave();
    }
  }

  private leave(): void {
    this.leaving = true;
    void this.game.fadeOut(600).then(() => this.game.replaceAll(new FieldScene(this.state)));
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const text = PARAGRAPHS[this.index];
    if (!text) return;
    const e = this.elapsed;
    const alpha = e < FADE_MS ? e / FADE_MS : e < FADE_MS + HOLD_MS ? 1 : 1 - (e - FADE_MS - HOLD_MS) / FADE_MS;
    const lines = wrapText(text, 200);
    const y0 = Math.round(SCREEN_H / 2 - (lines.length * FONT_LINE_HEIGHT) / 2);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    lines.forEach((l, i) => drawTextCentered(ctx, l, SCREEN_W / 2, y0 + i * FONT_LINE_HEIGHT));
    ctx.globalAlpha = 1;
    drawTextCentered(ctx, 'X: skip', SCREEN_W / 2, SCREEN_H - 16, { color: COLOR_DISABLED });
  }
}
