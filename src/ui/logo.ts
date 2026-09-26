import { drawText, measureText } from '../engine/font';
import { createCanvas, ctx2d, outline } from '../gfx/pixelart';

/**
 * Renders text as a big pixel logo: the bitmap font scaled up by an integer
 * factor, filled with a vertical banded gradient and outlined twice.
 */
export function makeLogo(text: string, scale: number, colors: readonly string[], outlineColor = '#1a0f2e'): HTMLCanvasElement {
  const w = measureText(text) + 2;
  const h = 10;
  const mask = createCanvas(w, h);
  drawText(ctx2d(mask), text, 0, 0, { color: '#ffffff', shadow: null });

  const pad = 2;
  const big = createCanvas(w * scale + pad * 2, h * scale + pad * 2);
  const ctx = ctx2d(big);
  // Paint the gradient bands over the glyph area only (cap height ≈ rows 1..8 of the line box)...
  const top = pad + 1 * scale;
  const capH = 7 * scale;
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    const y0 = Math.round(top + (i * capH) / colors.length);
    const y1 = i === colors.length - 1 ? big.height : Math.round(top + ((i + 1) * capH) / colors.length);
    ctx.fillRect(0, i === 0 ? 0 : y0, big.width, y1 - (i === 0 ? 0 : y0));
  });
  // ...then keep it only where the scaled glyphs are.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0, w, h, pad, pad, w * scale, h * scale);
  ctx.globalCompositeOperation = 'source-over';
  return outline(outline(big, outlineColor), outlineColor);
}
