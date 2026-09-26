/**
 * Font preview: character set, pangram, a dialogue window and a menu window.
 * Open http://localhost:5173/dev/font.html
 */
import {
  FONT_LINE_HEIGHT,
  drawText,
  drawTextCentered,
  drawTextRight,
  measureText,
  wrapText,
} from '../src/engine/font';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const YELLOW = { color: '#f8e070' };
const GREY = { color: '#9098a8' };

/** FF-style window: blue vertical gradient, white border with a dark outer rim and clipped corners. */
function drawWindow(x: number, y: number, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#4868d8');
  grad.addColorStop(1, '#101868');
  ctx.fillStyle = '#181828';
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = '#a0a8c0';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = grad;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
}

// Background.
ctx.fillStyle = '#080810';
ctx.fillRect(0, 0, 256, 224);

let y = 2;

// Full character set: printable ASCII plus the extra glyphs and an unknown char.
let ascii = '';
for (let c = 33; c <= 126; c++) ascii += String.fromCharCode(c);
for (let i = 0; i < ascii.length; i += 32) {
  drawText(ctx, ascii.slice(i, i + 32), 3, y);
  y += FONT_LINE_HEIGHT;
}
drawText(ctx, 'Extras: … ♥ ★ ► ▼ — unknown:é', 3, y);
y += FONT_LINE_HEIGHT;
drawText(ctx, 'The quick brown fox jumps over the lazy dog.', 3, y);
y += FONT_LINE_HEIGHT;
drawText(ctx, 'SPHINX OF BLACK QUARTZ, JUDGE MY VOW!', 3, y, YELLOW);
y += FONT_LINE_HEIGHT;
drawText(ctx, 'Grey text: disabled (unavailable) items', 3, y, GREY);
y += FONT_LINE_HEIGHT + 2;

// Dialogue window.
const dialogue = 'Elder: The Heartstone grows dim… Will you journey to the Hollow Grotto?';
const dx = 4;
const dw = 248;
const lines = wrapText(dialogue, dw - 16);
const dh = 10 + lines.length * FONT_LINE_HEIGHT + 4;
drawWindow(dx, y, dw, dh);
lines.forEach((line, i) => drawText(ctx, line, dx + 8, y + 7 + i * FONT_LINE_HEIGHT));
drawText(ctx, '▼', dx + dw - 14, y + dh - 14);
y += dh + 3;

// Menu window with right-aligned numbers.
const mx = 4;
const mw = 124;
const items: [string, string, boolean][] = [
  ['Potion', 'x12', true],
  ['Hi-Potion', 'x3', true],
  ['Ether', 'x0', false],
  ['Phoenix Down', 'x7', true],
];
const mh = 8 + items.length * FONT_LINE_HEIGHT + 4;
drawWindow(mx, y, mw, mh);
items.forEach(([name, qty, enabled], i) => {
  const ly = y + 6 + i * FONT_LINE_HEIGHT;
  const style = enabled ? undefined : GREY;
  if (i === 0) drawText(ctx, '►', mx + 6, ly);
  drawText(ctx, name, mx + 13, ly, style);
  drawTextRight(ctx, qty, mx + mw - 8, ly, style);
});

// Status window.
const sx = 132;
const sw = 120;
drawWindow(sx, y, sw, mh);
const rows: [string, string][] = [
  ['HP', '128/245'],
  ['MP', '\u200736/\u200740'],
  ['Gold', '1500'],
  ['Lv', '7'],
];
rows.forEach(([label, value], i) => {
  const ly = y + 6 + i * FONT_LINE_HEIGHT;
  drawText(ctx, label, sx + 8, ly, YELLOW);
  drawTextRight(ctx, value, sx + sw - 8, ly);
});
y += mh + 2;

drawTextCentered(ctx, `★ ${measureText('0123456789')}px for 0-9 ★`, 128, y, GREY);
