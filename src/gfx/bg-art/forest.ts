/** Deep forest: layered trunks fading into mist, a leafy canopy, light shafts and a dirt trail. */
import { bayer, makeRamp, type Ramp } from '../paint/color';
import { valueNoise } from '../paint/noise';
import { Painter } from '../paint/painter';
import { seededRandom } from '../pixelart';
import { BG_H, BG_W, glow, gradientBands, groundDepth, lightWash } from './common';

const HORIZON = 94;
const DEPTH: Ramp = ['#0a1c16', '#10281c', '#163420', '#1e4226', '#28522c', '#346234', '#44743e'];
const FAR_TRUNK: Ramp = ['#1c3426', '#24402e', '#2e4c36', '#3a5a40'];
const MID_BARK = makeRamp('#4a3c30', 5, { shadow: '#08080c', light: 0.4 });
const BARK = makeRamp('#6e4e36', 6, { shadow: '#0a080e' });
const MOSS = makeRamp('#4e8a36', 5, { shadow: '#0c1c10' });
const LEAVES = makeRamp('#3c8838', 6, { shadow: '#061410' });
const BUSH = makeRamp('#2e6a34', 5, { shadow: '#061410' });
const FLOOR: Ramp = ['#1a2c16', '#24391c', '#304822', '#3e5a2a', '#4e6c32', '#62803c'];
const DIRT: Ramp = ['#4a3424', '#5e442e', '#76583a', '#8e6e48', '#a88658'];

export function drawForest(): HTMLCanvasElement {
  const p = new Painter(BG_W, BG_H);
  const rnd = seededRandom(5);
  gradientBands(p, 0, HORIZON, DEPTH);

  // Far trunks, hazy with distance (lighter towards the misty horizon).
  for (let x = 4; x < BG_W; x += 9 + Math.floor(rnd() * 10)) {
    const w = 3 + Math.floor(rnd() * 3);
    p.fill(p.rect(x, 0, w, HORIZON - 4), FAR_TRUNK, (px, y) => (y / HORIZON) * 3 + (px === x ? -1 : 0) + (bayer(px, y) - 0.5) * 0.8);
  }
  // Undergrowth along the horizon.
  for (let x = -4; x < BG_W + 4; x += 6 + Math.floor(rnd() * 6)) {
    p.shade(p.ellipse(x, HORIZON - 3, 6 + rnd() * 5, 4 + rnd() * 3), BUSH, { bias: -0.1, crease: 0, shadow: 0, noise: 0.2 });
  }

  // Mid-distance trunks: cylinders with bark streaks and flared roots.
  for (const [x, w] of [[38, 9], [82, 11], [128, 8], [170, 12], [206, 9]] as const) {
    const trunk = p.rect(x, 0, w, HORIZON - 1).union(p.ellipse(x + w / 2, HORIZON - 1, w * 0.9, 3));
    p.shade(trunk, MID_BARK, { round: w / 2, noise: 0.25, noiseScale: 1.5, falloff: -0.2, shadow: 0 });
    for (let i = 0; i < 3; i++) {
      const lx = x + 2 + Math.floor(rnd() * (w - 3));
      p.line(lx, 10 + rnd() * 30, lx, 50 + rnd() * 40, MID_BARK[0]);
    }
  }

  // Canopy: back clusters darker, front clusters catching the light.
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 30; i++) {
      const x = rnd() * (BG_W + 20) - 10;
      const y = layer ? rnd() * 22 : rnd() * 34;
      const leafy = p.ellipse(x, y, 9 + rnd() * 9, 5 + rnd() * 5);
      p.shade(leafy, LEAVES, { bias: layer ? 0.05 : -0.25, noise: 0.35, noiseScale: 2, noiseSeed: i + layer * 40, shadow: layer });
    }
  }
  // Hanging vines.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(rnd() * BG_W);
    const len = 14 + Math.floor(rnd() * 26);
    for (let y = 22; y < 22 + len; y++) p.dot(x + Math.round(Math.sin(y / 5 + i)), y, y % 4 === 0 ? LEAVES[4] : LEAVES[1]);
  }

  // Forest floor with a winding dirt trail.
  p.fill(p.rect(0, HORIZON, BG_W, BG_H - HORIZON), FLOOR, (x, y) => {
    const { depth, stripe } = groundDepth(y, HORIZON);
    return 4.2 - depth * 3 + (stripe % 2 ? 0.4 : -0.2) + (bayer(x, y) - 0.5) * 0.9;
  });
  const trailX = (y: number) => 128 + Math.sin((y - HORIZON) / 22) * 26;
  const trailHalf = (y: number) => 4 + (y - HORIZON) * 0.3;
  const trail = p.mask((x, y) => y > HORIZON + 1 && Math.abs(x - trailX(y)) < trailHalf(y));
  p.fill(trail, DIRT, (x, y) => {
    const { depth } = groundDepth(y, HORIZON);
    const edge = Math.abs(x - trailX(y)) / trailHalf(y);
    return 3.6 - depth * 2 - edge * 1.2 + (bayer(x, y) - 0.5) * 0.7;
  });

  // Ferns and grass tufts, bigger towards the viewer.
  for (let i = 0; i < 180; i++) {
    const y = Math.floor(HORIZON + 3 + (BG_H - HORIZON - 3) * rnd() ** 1.2);
    const x = Math.floor(rnd() * BG_W);
    if (trail.has(x, y)) continue;
    const { depth } = groundDepth(y, HORIZON);
    const h = 1 + Math.round(depth * 4);
    p.line(x, y, x - h, y - h, MOSS[1]);
    p.line(x, y, x + h, y - h, MOSS[2]);
    p.line(x, y, x, y - h - 1, MOSS[3]);
  }

  // Great foreground trunks framing the scene, with roots and moss on the lit side.
  const mossy = valueNoise(9, 4);
  const near = [
    { x: -8, w: 28, base: 120 },
    { x: 234, w: 30, base: 116 },
  ];
  for (const { x, w, base } of near) {
    const cx = x + w / 2;
    const trunk = p
      .rect(x, 0, w, base)
      .union(p.poly([[x - 6, base + 4], [x + 2, base - 18], [x + w - 2, base - 18], [x + w + 8, base + 4], [cx + 4, base - 2], [cx - 4, base + 1]]));
    p.shade(trunk, BARK, { round: w / 2, noise: 0.25, noiseScale: 1.5, falloff: -0.1 });
    for (let i = 0; i < 6; i++) {
      const lx = x + 3 + Math.floor(rnd() * (w - 5));
      const y0 = Math.floor(rnd() * 60);
      p.line(lx, y0, lx + (rnd() < 0.5 ? -1 : 1), y0 + 20 + rnd() * 40, BARK[0]);
    }
    p.decal(trunk.intersect(p.mask((px, y) => px < x + w * 0.45 && mossy(px, y) > 0.05)), MOSS, { bias: 0.05 });
  }

  const canvas = p.toCanvas();
  // Shafts of sunlight slanting through gaps in the canopy.
  for (const [x, w] of [[60, 10], [112, 6], [150, 14]] as const) {
    lightWash(canvas, p.poly([[x, 20], [x + w, 20], [x + w + 46, HORIZON + 30], [x + 46 - w * 0.3, HORIZON + 30]]), '#e6ffb0', 0.1);
    glow(canvas, x + w / 2 + 44, HORIZON + 30, w + 10, 6, '#e6ffb0', 0.25);
  }
  return canvas;
}
