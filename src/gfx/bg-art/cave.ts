/** Rocky cave: stalactites, boulder walls around a faintly lit passage, stalagmites and glowing cyan crystals. */
import { bayer, makeRamp, type Ramp } from '../paint/color';
import type { Point } from '../paint/mask';
import { Painter } from '../paint/painter';
import { boulder, crystal, spike } from '../paint/props';
import { seededRandom } from '../pixelart';
import { BG_H, BG_W, glow, gradientBands, groundDepth } from './common';

const HORIZON = 96;
const WALL: Ramp = ['#0a080e', '#110e16', '#18141e', '#201a26', '#2a222e', '#342a36'];
const ROCK = makeRamp('#6e6058', 6, { shadow: '#06040a', light: 0.45 });
const FAR_ROCK = makeRamp('#4a4050', 5, { shadow: '#06040a', light: 0.4 });
const FLOOR: Ramp = ['#161214', '#211b1c', '#2c2424', '#382e2c', '#463a36', '#564840'];
const CYAN: Ramp = ['#0c2a3a', '#14506a', '#1e7c9a', '#40b0c8', '#8ae0ec', '#e0ffff'];

export function drawCave(): HTMLCanvasElement {
  const p = new Painter(BG_W, BG_H);
  const rnd = seededRandom(3);
  gradientBands(p, 0, HORIZON, WALL);

  // Back wall of piled boulders, leaving an arched passage in the middle.
  const passage = p.ellipse(128, HORIZON, 22, 40);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * BG_W;
    const y = 20 + rnd() * (HORIZON - 24);
    const b = boulder(p, x, y, 10 + rnd() * 14, 8 + rnd() * 9, i + 1).subtract(passage);
    p.shade(b, FAR_ROCK, { round: 5, noise: 0.25, noiseSeed: i, bias: -0.25 + (y / HORIZON) * 0.2, shadow: 0 });
  }

  // Ceiling rock and hanging stalactites (big ones near the edges).
  for (let x = -8; x < BG_W + 8; x += 10 + rnd() * 8) {
    p.shade(boulder(p, x, 4, 12 + rnd() * 6, 8 + rnd() * 5, x), ROCK, { round: 5, noise: 0.2, bias: -0.2, shadow: 0 });
  }
  for (let i = 0; i < 16; i++) {
    const x = rnd() * BG_W;
    const edge = Math.abs(x - 128) / 128;
    spike(p, x, 8, 3 + rnd() * 4 + edge * 5, 10 + rnd() * 20 + edge * 22, ROCK, -0.1);
  }

  // Stalagmites rising from the far floor.
  for (let i = 0; i < 12; i++) {
    const x = rnd() * BG_W;
    if (Math.abs(x - 128) < 26) continue;
    const edge = Math.abs(x - 128) / 128;
    spike(p, x, HORIZON + 3, 3 + rnd() * 3 + edge * 4, -(8 + rnd() * 12 + edge * 18), ROCK, -0.05);
  }

  // Stony floor with perspective banding, cracks and pebbles.
  p.fill(p.rect(0, HORIZON, BG_W, BG_H - HORIZON), FLOOR, (x, y) => {
    const { depth, stripe } = groundDepth(y, HORIZON);
    return 4.4 - depth * 3.4 + (stripe % 2 ? 0.35 : -0.2) + (bayer(x, y) - 0.5) * 0.8;
  });
  for (let i = 0; i < 10; i++) {
    let x = rnd() * BG_W, y = HORIZON + 6 + rnd() * 60;
    const pts: Point[] = [[x, y]];
    for (let k = 0; k < 4; k++) pts.push([(x += (rnd() - 0.5) * 16), (y += 1 + rnd() * 4)]);
    p.polyline(FLOOR[0], pts);
  }
  for (let i = 0; i < 60; i++) {
    const y = HORIZON + 4 + (BG_H - HORIZON) * rnd() ** 1.3;
    const s = 0.8 + groundDepth(y, HORIZON).depth * 3;
    p.shade(p.ellipse(rnd() * BG_W, y, s * 1.4, s * 0.8), ROCK, { bias: -0.15, crease: 0, shadow: 1 });
  }

  // Foreground boulders framing the left and right edges.
  p.shade(boulder(p, 6, 124, 22, 20, 7), ROCK, { round: 8, noise: 0.25, noiseSeed: 77 });
  p.shade(boulder(p, 252, 112, 20, 26, 9), ROCK, { round: 8, noise: 0.25, noiseSeed: 78 });

  // Cyan crystal clusters sprouting from the walls.
  const clusters: [number, number, number][] = [[40, 70, 1], [214, 60, -1], [92, 88, 1], [174, 90, -1]];
  for (const [x, y, dir] of clusters) {
    crystal(p, x, y, x - 3 * dir, y - 12, 2.2, CYAN);
    crystal(p, x + 3 * dir, y, x + 8 * dir, y - 8, 1.6, CYAN);
    crystal(p, x - 3 * dir, y + 1, x - 8 * dir, y - 5, 1.3, CYAN);
  }

  const canvas = p.toCanvas();
  glow(canvas, 128, HORIZON - 14, 26, 30, '#3a8a9a', 0.35); // light from beyond the passage
  glow(canvas, 128, HORIZON + 14, 90, 22, '#2a5a6a', 0.22); // ...spilling onto the floor
  for (const [x, y] of clusters) glow(canvas, x, y - 5, 16, 14, '#40c0d8', 0.3);
  return canvas;
}
