/** The dark "top of wall" surface shared by interior and cave walls. */
import type { Painter } from './painter';
import { E, N, NE, NW, S, SE, SW, W, has } from './types';

export interface WallTopColors {
  base: string;
  texture: string;
  /** Rim on edges facing the light (north/west). */
  rimLit: string;
  /** Rim on edges facing away from the light (east). */
  rimShade: string;
}

/**
 * Fills the tile with the wall-top colour and draws a thin rim wherever the
 * wall borders open floor, so wall masses read as solid blocks from above.
 * `mask` holds 8-neighbour bits of tiles that count as the same wall.
 */
export function wallTop(p: Painter, mask: number, c: WallTopColors): void {
  p.rect(0, 0, 16, 16, c.base);
  p.checker(0, 0, 16, 16, c.texture);
  if (!has(mask, N)) p.hline(0, 0, 16, c.rimLit);
  if (!has(mask, W)) p.vline(0, 0, 16, c.rimLit);
  if (!has(mask, E)) p.vline(15, 0, 16, c.rimShade);
  // Corner nubs where only the diagonal neighbour is open.
  if (has(mask, N) && has(mask, W) && !has(mask, NW)) p.px(0, 0, c.rimLit);
  if (has(mask, N) && has(mask, E) && !has(mask, NE)) p.px(15, 0, c.rimShade);
  if (has(mask, S) && has(mask, W) && !has(mask, SW)) p.px(0, 15, c.rimLit);
  if (has(mask, S) && has(mask, E) && !has(mask, SE)) p.px(15, 15, c.rimShade);
}
