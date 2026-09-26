/** Grassy plains under a bright sky: clouds, snow-capped mountains, rolling hills. */
import { bayer, makeRamp, type Ramp } from '../paint/color';
import { Painter } from '../paint/painter';
import { seededRandom } from '../pixelart';
import { boulder } from '../paint/props';
import { BG_H, BG_W, gradientBands, groundDepth, ridge, waves } from './common';

const HORIZON = 88;
const SKY: Ramp = ['#2a48b0', '#3458c4', '#4270d4', '#548ae2', '#6ca4ec', '#8cc0f2', '#b0d8f8', '#d4ecfc'];
const CLOUD: Ramp = ['#8494d0', '#a4b4e4', '#c8d6f4', '#e8f0fc', '#ffffff'];
const FAR_MTN: Ramp = ['#5a64a8', '#6a78bc', '#7e8ecc', '#98a8dc', '#b4c2ea'];
const SNOW: Ramp = ['#a8b4e0', '#c8d4f0', '#e8f0ff', '#ffffff'];
const HILLS: Ramp = ['#2e6a5a', '#3a7e62', '#4a926a', '#5ea672', '#7aba80'];
const TREES = makeRamp('#2e6a3e', 5, { shadow: '#0e2030' });
const ROCK = makeRamp('#8a8478', 5, { shadow: '#1a1a2a' });
const GRASS: Ramp = ['#2a5424', '#36702e', '#448838', '#56a042', '#6cb64c', '#88c85c'];

function cloud(p: Painter, cx: number, cy: number, size: number): void {
  const puffs = [[-1.6, 0.2, 0.6], [-0.8, -0.35, 0.8], [0, -0.6, 1], [0.9, -0.3, 0.75], [1.7, 0.15, 0.55]] as const;
  let m = p.ellipse(cx, cy + size * 0.2, size * 2.2, size * 0.45);
  for (const [dx, dy, r] of puffs) m = m.union(p.circle(cx + dx * size, cy + dy * size, r * size));
  m = m.subtract(p.rect(0, cy + size * 0.45, BG_W, BG_H));
  p.shade(m, CLOUD, { falloff: 0.5, bias: 0.12, crease: 0, shadow: 0, dither: 0.8 });
}

export function drawPlains(): HTMLCanvasElement {
  const p = new Painter(BG_W, BG_H);
  gradientBands(p, 0, HORIZON, SKY);

  cloud(p, 44, 30, 9);
  cloud(p, 150, 18, 7);
  cloud(p, 222, 40, 10);
  cloud(p, 104, 50, 5);

  // Distant snow-capped range.
  const farTop = (x: number) => 56 + waves(x, [[9, 110, 0.6], [5, 47, 1.9], [2, 19, 0.3]]);
  p.shade(ridge(p, farTop, HORIZON), FAR_MTN, { round: 7, falloff: -0.3, crease: 0, shadow: 0, dither: 0.7 });
  p.decal(ridge(p, farTop, HORIZON).intersect(p.mask((x, y) => y < 54 + waves(x, [[2, 13, 0], [1, 5, 1]]))), SNOW, { bias: 0.1 });

  // Rolling hills lined with little trees.
  const hillTop = (x: number) => 74 + waves(x + 30, [[5, 90, 0], [3, 37, 1.1]]);
  p.shade(ridge(p, hillTop, HORIZON + 2), HILLS, { round: 12, falloff: -0.1, crease: 0, shadow: 0 });
  const rnd = seededRandom(11);
  for (let x = 2; x < BG_W; x += 3 + Math.floor(rnd() * 5)) {
    const h = 2 + rnd() * 2.5;
    p.shade(p.ellipse(x, hillTop(x) - h * 0.4, 1.8 + rnd(), h), TREES, { crease: 0, shadow: 0, bias: 0.05 });
  }

  // Grass field with perspective stripes.
  p.fill(p.rect(0, HORIZON, BG_W, BG_H - HORIZON), GRASS, (x, y) => {
    const { depth, stripe } = groundDepth(y, HORIZON);
    return 4.6 - depth * 3.2 + (stripe % 2 ? 0.45 : -0.2) + (bayer(x, y) - 0.5) * 0.9;
  });
  // Grass tufts, flowers and pebbles; bigger towards the viewer.
  for (let i = 0; i < 260; i++) {
    const y = Math.floor(HORIZON + 3 + (BG_H - HORIZON - 3) * rnd() ** 1.3);
    const x = Math.floor(rnd() * BG_W);
    const { depth } = groundDepth(y, HORIZON);
    const h = 1 + Math.round(depth * 3);
    const dark = GRASS[Math.max(0, Math.round(3.2 - depth * 3))];
    const light = GRASS[Math.min(5, Math.round(5.4 - depth * 2))];
    p.line(x, y, x - 1, y - h, dark);
    p.line(x + 1, y, x + 2, y - h, dark);
    p.line(x + 1, y - 1, x + 1, y - h - 1, light);
  }
  for (let i = 0; i < 40; i++) {
    const y = Math.floor(HORIZON + 10 + (BG_H - HORIZON - 10) * rnd());
    const x = Math.floor(rnd() * BG_W);
    p.dot(x, y, rnd() < 0.5 ? '#fff4c0' : '#f0a8c8');
    p.dot(x, y + 1, GRASS[1]);
  }
  // A few weathered rocks and bushes, kept towards the edges of the battlefield.
  for (const [x, y, s] of [[14, 104, 6], [244, 98, 4], [150, 94, 2.5], [236, 138, 8], [70, 96, 3]] as const) {
    p.shade(boulder(p, x, y - s * 0.5, s * 1.4, s, x), ROCK, { round: s * 0.6, noise: 0.15 });
    p.shade(p.ellipse(x + s * 1.3, y - s * 0.2, s * 0.9, s * 0.6), TREES, { bias: 0.1, noise: 0.3, crease: 0 });
  }
  return p.toCanvas();
}

