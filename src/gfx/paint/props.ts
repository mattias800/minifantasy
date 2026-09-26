/**
 * Reusable painted props shared by monsters and backgrounds: faceted crystals
 * and irregular boulders.
 */
import type { Ramp } from './color';
import type { Mask, Point } from './mask';
import type { Painter } from './painter';

/**
 * Faceted crystal from base centre (bx, by) to tip (tx, ty).
 * The facet turned towards the top-left light is bright, the other dark, with a
 * bright ridge along the axis and brighter tones towards the tip. Needs a ramp
 * of at least 5 shades.
 */
export function crystal(p: Painter, bx: number, by: number, tx: number, ty: number, halfWidth: number, ramp: Ramp): Mask {
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const ux = (tx - bx) / len, uy = (ty - by) / len;
  const nx = -uy, ny = ux; // perpendicular
  const shoulder = 0.68;
  // Which side of the axis faces the light (light comes from -x,-y).
  const litSide = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1;
  const top = ramp.length - 1;
  const local = (x: number, y: number): [number, number] => {
    const dx = x + 0.5 - bx, dy = y + 0.5 - by;
    return [dx * ux + dy * uy, dx * nx + dy * ny];
  };
  const shape = p.mask((x, y) => {
    const [s, q] = local(x - 0.5, y - 0.5);
    if (s < -0.5 || s > len) return false;
    const w = s < len * shoulder ? halfWidth : (halfWidth * (len - s)) / (len * (1 - shoulder));
    return Math.abs(q) <= w + 0.35;
  });
  p.fill(shape, ramp, (x, y) => {
    const [s, q] = local(x, y);
    const toTip = s / len;
    if (Math.abs(q) < 0.6) return top - (toTip > 0.4 ? 0 : 1); // ridge
    const lit = Math.sign(q) === litSide;
    return (lit ? top - 1 : top - 3) - (toTip < 0.35 ? 1 : 0);
  });
  return shape;
}

/** Irregular rounded-polygon boulder outline (deterministic per seed). */
export function boulder(p: Painter, cx: number, cy: number, rx: number, ry: number, seed: number, sides = 9): Mask {
  const pts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + seed * 0.7;
    const jitter = 0.84 + 0.18 * Math.abs(Math.sin(seed * 12.9898 + i * 78.233));
    pts.push([cx + Math.cos(a) * rx * jitter, cy + Math.sin(a) * ry * jitter]);
  }
  return p.poly(pts);
}

/** Rock spike hanging down from (x, baseY), or rising up when `length` is negative (stalactites, stalagmites). */
export function spike(p: Painter, x: number, baseY: number, halfWidth: number, length: number, ramp: Ramp, bias = 0): Mask {
  const tipX = x + halfWidth * 0.25;
  const shape = p.poly([
    [x - halfWidth, baseY], [x - halfWidth * 0.4, baseY + length * 0.55], [tipX, baseY + length], [x + halfWidth * 0.5, baseY + length * 0.5], [x + halfWidth, baseY],
  ]);
  p.shade(shape, ramp, { round: Math.max(2, halfWidth * 0.8), bias, noise: 0.15, crease: 0 });
  return shape;
}
