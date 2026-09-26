import { audio } from '../audio/Audio';
import { SCREEN_H, SCREEN_W } from '../engine/constants';
import { drawText, FONT_LINE_HEIGHT, wrapText } from '../engine/font';
import { Scene } from '../engine/Scene';
import { Menu } from './Menu';
import { drawWindow } from './Window';
import { COLOR_HIGHLIGHT } from './colors';

const LINES_PER_PAGE = 4;
const PADDING = 8;
const CHARS_PER_SECOND = 60;

export type MessagePosition = 'top' | 'bottom';

export interface MessageOptions {
  speaker?: string;
  position?: MessagePosition;
  /** Choices shown after the last page; the scene then resolves with the chosen index. */
  choices?: string[];
  /** Index returned if the player cancels a choice (defaults to the last option). */
  cancelChoice?: number;
}

/**
 * A dialogue box with typewriter text, paged 4 lines at a time, optionally
 * ending in a choice. Resolves with the chosen index (or -1 without choices).
 */
export class MessageScene extends Scene<number> {
  override transparent = true;
  private readonly pages: string[][];
  private page = 0;
  private shown = 0;
  private readonly menu: Menu | null;
  private readonly boxY: number;
  private readonly boxH: number;

  constructor(
    text: string,
    private readonly opts: MessageOptions = {},
  ) {
    super();
    const width = SCREEN_W - 16 - PADDING * 2;
    const lines = wrapText(text, width);
    this.pages = [];
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) this.pages.push(lines.slice(i, i + LINES_PER_PAGE));
    if (this.pages.length === 0) this.pages.push(['']);
    this.boxH = LINES_PER_PAGE * FONT_LINE_HEIGHT + PADDING * 2 - 2 + (opts.speaker ? FONT_LINE_HEIGHT : 0);
    this.boxY = opts.position === 'top' ? 8 : SCREEN_H - this.boxH - 8;

    if (opts.choices?.length) {
      const menuW = Math.max(...opts.choices.map((c) => c.length)) * 6 + 28;
      const rows = opts.choices.length;
      const menuY = opts.position === 'top' ? this.boxY + this.boxH + 4 : this.boxY - rows * (FONT_LINE_HEIGHT + 1) - 14;
      this.menu = new Menu(
        opts.choices.map((label) => ({ label })),
        { x: SCREEN_W - 8 - menuW + 18, y: menuY + 7, width: menuW - 24, rows },
      );
    } else {
      this.menu = null;
    }
  }

  private get pageText(): string[] {
    return this.pages[this.page];
  }

  private get pageLength(): number {
    return this.pageText.reduce((n, l) => n + l.length, 0);
  }

  private get typing(): boolean {
    return this.shown < this.pageLength;
  }

  private get onLastPage(): boolean {
    return this.page === this.pages.length - 1;
  }

  update(dt: number): void {
    const input = this.game.input;
    if (this.typing) {
      this.shown = Math.min(this.pageLength, this.shown + (dt / 1000) * CHARS_PER_SECOND);
      if (input.pressed('confirm')) this.shown = this.pageLength;
      return;
    }
    if (this.onLastPage && this.menu) {
      const ev = this.menu.update(input);
      if (ev === 'select') this.finish(this.menu.index);
      if (ev === 'cancel') this.finish(this.opts.cancelChoice ?? this.menu.items.length - 1);
      return;
    }
    if (input.pressed('confirm') || input.pressed('cancel')) {
      if (this.onLastPage) {
        this.finish(-1);
      } else {
        audio.playSfx('cursor');
        this.page++;
        this.shown = 0;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const x = 8;
    drawWindow(ctx, x, this.boxY, SCREEN_W - 16, this.boxH);
    let y = this.boxY + PADDING - 1;
    if (this.opts.speaker) {
      drawText(ctx, this.opts.speaker, x + PADDING, y, { color: COLOR_HIGHLIGHT });
      y += FONT_LINE_HEIGHT;
    }
    let remaining = Math.floor(this.shown);
    for (const line of this.pageText) {
      if (remaining <= 0) break;
      drawText(ctx, line.slice(0, remaining), x + PADDING, y);
      remaining -= line.length;
      y += FONT_LINE_HEIGHT;
    }
    if (!this.typing) {
      if (this.onLastPage && this.menu) {
        const m = this.menu;
        drawWindow(ctx, m.opts.x - 18, m.opts.y - 7, m.opts.width + 24, m.height + 12);
        m.render(ctx, this.game.time);
      } else if (Math.floor(this.game.time / 300) % 2 === 0) {
        drawText(ctx, '▼', SCREEN_W - 8 - PADDING - 6, this.boxY + this.boxH - PADDING - 6);
      }
    }
  }
}
