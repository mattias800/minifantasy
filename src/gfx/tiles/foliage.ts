/** Leafy shapes shared by forests, town trees, bushes and potted plants. */
import { CANOPY } from './palette';
import { Painter, ditherPick } from './painter';

const LEAF_RAMP = [CANOPY[1], CANOPY[2], CANOPY[3], CANOPY[4], CANOPY[5]];

/**
 * A round clump of leaves lit from the top-left: dithered light-to-shadow ramp,
 * a dark rim on the shadow side and a small specular spot. Clipped to the tile.
 */
export function leafBall(p: Painter, cx: number, cy: number, r: number, ramp: readonly string[] = LEAF_RAMP): void {
  p.ellipse(cx, cy, r, r, (x, y, nx, ny) => {
    if (x < 0 || y < 0 || x > 15 || y > 15) return null;
    const dist = Math.hypot(nx, ny);
    const light = -(nx * 0.6 + ny * 0.8);
    if (dist > 0.8 && light < 0.3) return CANOPY[0];
    if (dist < 0.4 && light > 0.25 && ((x + y) & 1) === 0) return ramp[4];
    return ditherPick(ramp, 0.35 + light * 0.45, x, y, 0.45);
  });
}

/** Several overlapping leaf balls, drawn top to bottom so lower clumps overlap upper ones. */
export function leafCluster(p: Painter, balls: readonly (readonly [number, number, number])[]): void {
  const sorted = [...balls].sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of sorted) leafBall(p, x, y, r);
}
