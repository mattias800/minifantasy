/** The Umbral Wyrm's lair: a black crystal cavern lit by glowing violet (and a few crimson) crystals. */
import { bayer, makeRamp, type Ramp } from '../paint/color';
import { Painter } from '../paint/painter';
import { crystal, spike } from '../paint/props';
import { seededRandom } from '../pixelart';
import { BG_H, BG_W, glow, gradientBands, groundDepth, lightWash, ridge, waves } from './common';

const HORIZON = 98;
const VOID: Ramp = ['#040208', '#08050e', '#0e0818', '#140c22', '#1b102c', '#231436'];
const OBSIDIAN = makeRamp('#3a2a4c', 6, { shadow: '#020106', light: 0.35 });
const FAR_ROCK = makeRamp('#241a34', 5, { shadow: '#020106', light: 0.3 });
const FLOOR: Ramp = ['#07040c', '#0e0816', '#150c20', '#1e122c', '#281838', '#341f46'];
const VIOLET: Ramp = ['#1e0838', '#3e1470', '#6424b0', '#8c44e0', '#b47cff', '#e4ccff'];
const CRIMSON: Ramp = ['#2a0610', '#5a0c20', '#9a1a3a', '#d83a5a', '#ff7a90', '#ffd0da'];

/** Fan of outlined crystals growing from one root point; returns the glow anchor. */
function cluster(p: Painter, x: number, y: number, size: number, lean: number, ramp: Ramp, rnd: () => number): [number, number] {
  const shards = 3 + Math.floor(rnd() * 3);
  let all = p.mask(() => false);
  for (let i = 0; i < shards; i++) {
    const a = -Math.PI / 2 + lean + (i - (shards - 1) / 2) * 0.38 + (rnd() - 0.5) * 0.2;
    const len = size * (i === Math.floor(shards / 2) ? 1 : 0.45 + rnd() * 0.4);
    all = all.union(crystal(p, x + (i - shards / 2) * size * 0.08, y, x + Math.cos(a) * len, y + Math.sin(a) * len, Math.max(1.2, size * 0.12), ramp));
  }
  if (size > 20) p.flat(all.ring(), '#0a0414');
  return [x + Math.cos(-Math.PI / 2 + lean) * size * 0.4, y - size * 0.4];
}

export function drawLair(): HTMLCanvasElement {
  const p = new Painter(BG_W, BG_H);
  const rnd = seededRandom(13);
  gradientBands(p, 0, HORIZON, VOID);
  const glows: [number, number, number, string][] = [];

  // Distant jagged cavern walls with small glimmering crystals.
  const farTop = (x: number) => 48 + waves(x, [[10, 70, 0.3], [6, 23, 1.2], [3, 9, 2.2]]);
  p.shade(ridge(p, farTop, HORIZON), FAR_ROCK, { round: 6, noise: 0.12, bias: -0.1, falloff: -0.25, crease: 0, shadow: 0 });
  for (let i = 0; i < 7; i++) {
    const x = 16 + rnd() * 224;
    const [gx, gy] = cluster(p, x, farTop(x) + 12 + rnd() * 20, 7 + rnd() * 5, (rnd() - 0.5) * 0.6, VIOLET, rnd);
    glows.push([gx, gy, 12, '#7a3ae0']);
  }

  // Ceiling: black stalactites, some tipped with hanging crystals.
  for (let i = 0; i < 18; i++) {
    const x = rnd() * BG_W;
    const edge = Math.abs(x - 128) / 128;
    const len = 8 + rnd() * 16 + edge * 26;
    const w = 3 + rnd() * 4 + edge * 4;
    spike(p, x, -1, w, len, OBSIDIAN, -0.15);
    if (i % 3 === 0) {
      crystal(p, x + w * 0.25, len - 4, x + w * 0.25, len + 8, 1.8, VIOLET);
      glows.push([x, len + 4, 10, '#8a4af0']);
    }
  }

  // Obsidian floor with a violet sheen banding towards the horizon.
  p.fill(p.rect(0, HORIZON, BG_W, BG_H - HORIZON), FLOOR, (x, y) => {
    const { depth, stripe } = groundDepth(y, HORIZON);
    return 5 - depth * 4.5 + (stripe % 2 ? 0.4 : -0.3) + (bayer(x, y) - 0.5) * 0.8;
  });
  for (let i = 0; i < 14; i++) {
    const x = rnd() * BG_W;
    const y = HORIZON + 6 + rnd() * 50;
    if (Math.abs(x - 90) < 50 && y < HORIZON + 40) continue; // keep the boss's footing clear
    crystal(p, x, y, x + (rnd() - 0.5) * 6, y - 3 - rnd() * 5, 1.2, rnd() < 0.25 ? CRIMSON : VIOLET);
  }

  // Towering crystal formations framing both sides, plus a crimson heart-crystal at the back.
  const big: [number, number, number, number, Ramp][] = [
    [8, 132, 92, 0.25, VIOLET], [30, 118, 60, -0.1, VIOLET], [238, 128, 96, -0.25, VIOLET],
    [216, 112, 54, 0.15, VIOLET], [150, HORIZON + 2, 44, 0.05, CRIMSON], [178, HORIZON + 6, 30, -0.2, VIOLET],
  ];
  for (const [x, y, size, lean, ramp] of big) {
    const [gx, gy] = cluster(p, x, y, size, lean, ramp, rnd);
    glows.push([gx, gy, size * 0.45, ramp === CRIMSON ? '#e03a6a' : '#8a4af0']);
  }

  const canvas = p.toCanvas();
  // Low violet mist hugging the horizon, reflections on the glassy floor, then the crystal glows.
  glow(canvas, 128, HORIZON + 2, 170, 12, '#5a2a9a', 0.3);
  for (const [x, y, size, lean, ramp] of big) {
    const w = size * 0.12;
    const reflect = p.poly([[x - w, y + 2], [x + w, y + 2], [x - lean * 20, y + size * 0.4]]);
    lightWash(canvas, reflect, ramp === CRIMSON ? '#a02040' : '#6a30c0', 0.12);
  }
  for (const [x, y, r, color] of glows) glow(canvas, x, y, r, r, color, 0.2);
  // Drifting motes.
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rnd() < 0.7 ? VIOLET[4] : VIOLET[5];
    ctx.fillRect(Math.floor(rnd() * BG_W), Math.floor(rnd() * 150), 1, 1);
  }
  return canvas;
}
