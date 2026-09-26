import { spriteFromRows } from '../gfx/pixelart';

/** Classic blue menu window: banded vertical gradient with a bevelled light border. */
const GRADIENT_TOP = [64, 88, 208];
const GRADIENT_BOTTOM = [16, 24, 104];
const BAND_PX = 3;

export interface WindowStyle {
  /** 0..1 opacity of the window body. */
  alpha?: number;
}

export function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: WindowStyle = {}): void {
  x = Math.round(x);
  y = Math.round(y);
  const baseAlpha = ctx.globalAlpha;
  ctx.save();
  ctx.globalAlpha = baseAlpha * (style.alpha ?? 1);

  // Body gradient drawn as discrete bands, like SNES colour math.
  const bands = Math.ceil((h - 4) / BAND_PX);
  for (let i = 0; i < bands; i++) {
    const t = bands <= 1 ? 0 : i / (bands - 1);
    const r = Math.round(GRADIENT_TOP[0] + (GRADIENT_BOTTOM[0] - GRADIENT_TOP[0]) * t);
    const g = Math.round(GRADIENT_TOP[1] + (GRADIENT_BOTTOM[1] - GRADIENT_TOP[1]) * t);
    const b = Math.round(GRADIENT_TOP[2] + (GRADIENT_BOTTOM[2] - GRADIENT_TOP[2]) * t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const by = y + 2 + i * BAND_PX;
    ctx.fillRect(x + 2, by, w - 4, Math.min(BAND_PX, y + h - 2 - by));
  }
  ctx.globalAlpha = baseAlpha;

  // Border: dark outer line, bright bevel, soft inner line. Corners are rounded by skipping pixels.
  ctx.fillStyle = '#080818';
  ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1);
  ctx.fillRect(x + w - 2, y + h - 2, 1, 1);

  ctx.fillStyle = '#f0f0ff';
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.fillRect(x + 1, y + 2, 1, h - 4);
  ctx.fillStyle = '#b8bcd8';
  ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
  ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
  ctx.fillStyle = '#9098c0';
  ctx.fillRect(x + 2, y + 2, w - 4, 1);
  ctx.fillRect(x + 2, y + 2, 1, h - 4);
  ctx.restore();
}

let cursorSprite: HTMLCanvasElement | null = null;

/** The pointing-glove menu cursor, 14x9, fingertip at the right edge. */
export function getCursorSprite(): HTMLCanvasElement {
  if (!cursorSprite) {
    cursorSprite = spriteFromRows(
      [
        '..#####.......',
        '.#wwwww######.',
        '#wwwwwwwwwwwwk',
        '#wwwwwwk#####.',
        '#wwwwwwwk.....',
        '#gwwwwwk......',
        '#ggwwwwwk.....',
        '.#gggggk......',
        '..######......',
      ],
      { '#': '#101018', k: '#303048', w: '#ffffff', g: '#a0a8c8' },
    );
  }
  return cursorSprite;
}

/** Draws the cursor so its fingertip points at (x, y). Bobs gently when `animate` is set. */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, animate = true): void {
  const bob = animate ? Math.round(Math.sin(time / 110) * 1 + 1) - 1 : 0;
  ctx.drawImage(getCursorSprite(), Math.round(x - 14 + bob), Math.round(y - 4));
}
