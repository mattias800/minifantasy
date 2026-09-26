/**
 * Quadrupeds and constructs: the forest wolf (48x48) and the mossy rock golem
 * (64x64). Both face right.
 */
import { makeRamp } from '../paint/color';
import type { Point } from '../paint/mask';
import { valueNoise } from '../paint/noise';
import type { Painter } from '../paint/painter';
import { boulder } from '../paint/props';

// ------------------------------------------------------------------- wolf

const WOLF_FUR = makeRamp('#6f82a6', 6, { shadow: '#0e0c22' });
const WOLF_PALE = makeRamp('#bac8dc', 6, { shadow: '#2a2844' });

/** Zig-zag fur tufts along a line, pointing in direction (dx, dy). */
function tufts(p: Painter, from: Point, to: Point, count: number, dx: number, dy: number) {
  let m = p.mask(() => false);
  for (let i = 0; i < count; i++) {
    const t0 = i / count, t1 = (i + 1) / count, tm = (t0 + t1) / 2;
    const at = (t: number): Point => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    const [ax, ay] = at(t0), [bx, by] = at(t1), [mx, my] = at(tm);
    m = m.union(p.poly([[ax, ay], [mx + dx - (bx - ax) * 0.3, my + dy], [bx, by]]));
  }
  return m;
}

export function drawWolf(p: Painter): void {
  const fur = { noise: 0.12, noiseScale: 1.5, contrast: 1.1 };
  // Bushy tail and far legs.
  p.shade(p.path([[9, 23, 2.2], [4, 25, 3], [2, 31, 2.6], [3.5, 36, 1.2]], 4).union(tufts(p, [1, 27], [3, 37], 3, -1.5, 0)), WOLF_FUR, { ...fur, bias: -0.05 });
  p.shade(p.capsule(10, 32, 7, 39, 3, 2).union(p.capsule(7, 39, 10, 45, 1.8, 1.5), p.ellipse(11, 45.5, 2.5, 1.2)), WOLF_FUR, { bias: -0.25 });
  p.shade(p.capsule(30, 33, 30, 45, 2.4, 1.7).union(p.ellipse(31.5, 45.5, 2.5, 1.2)), WOLF_FUR, { bias: -0.25 });

  // Body: haunch, back and deep chest, with bristling fur along the spine.
  const body = p
    .ellipse(20, 28, 11, 7)
    .union(p.ellipse(29, 29, 6.5, 8), p.ellipse(11, 29, 6, 7), tufts(p, [10, 22.5], [28, 21.5], 6, -1.5, -2.5));
  p.shade(body, WOLF_FUR, fur);
  p.decal(p.ellipse(21, 34.5, 9, 2.5).union(tufts(p, [13, 36], [29, 36], 5, -1, 2)), WOLF_PALE, { bias: 0.1 });

  // Near legs.
  p.shade(p.ellipse(11, 31, 6, 6.5).union(p.capsule(11, 34, 15, 40, 3.5, 2), p.capsule(15, 40, 13, 45, 1.8, 1.6), p.ellipse(14.5, 45.5, 2.8, 1.3)), WOLF_FUR, fur);
  p.shade(p.capsule(34, 33, 34.5, 45, 2.8, 2).union(p.ellipse(36, 45.5, 3, 1.3)), WOLF_FUR, fur);

  // Shaggy ruff around the neck, and the far ear tucked behind the head.
  const ruff = p.poly([[26, 21], [30, 17.5], [33, 19.5], [36, 19], [38, 24], [38, 29], [36, 34], [34, 31.5], [32, 36], [30, 32], [27, 34], [26.5, 28]]);
  p.shade(ruff, WOLF_FUR, { ...fur, bias: 0.1 });
  p.shade(p.poly([[36, 18], [38.5, 11], [40.5, 18]]), WOLF_FUR, { bias: -0.2, round: 2 });

  // Lowered head with a long muzzle and open, snarling jaws.
  p.shade(p.ellipse(37, 21.5, 5.5, 5), WOLF_FUR, fur);
  p.flat(p.poly([[39, 24.5], [47.5, 24.5], [46, 29.5], [39, 29]]), '#4a0e1a'); // mouth interior
  p.shade(p.poly([[38, 18.5], [47.5, 22], [47.5, 25], [38, 26]]), WOLF_FUR, { round: 2, contrast: 1.1 });
  p.decal(p.poly([[40, 23.5], [47.5, 23], [47.5, 25], [40, 25.5]]), WOLF_PALE);
  p.shade(p.poly([[37, 27.5], [45.5, 28.5], [44.5, 31], [38, 31]]), WOLF_PALE, { round: 2, bias: -0.05 });
  p.dots('#fffbee', [[41, 25], [43, 25], [45, 25], [46, 25], [42, 28], [44, 28]]);
  p.dot(47, 22, '#0e0c16'); // nose
  // Near ear laid back, with dark inner fur.
  p.shade(p.poly([[32.5, 20.5], [32, 12], [37.5, 18.5]]), WOLF_FUR, { round: 2 });
  p.dots('#2a1a30', [[33, 15], [33, 16], [34, 17]]);
  // Furious glowing eye under a creased brow.
  p.dots('#ffd23a', [[38, 20], [39, 20], [40, 21]]);
  p.dot(39, 20, '#ff7a1a');
  p.polyline(WOLF_FUR[0], [[36, 19], [38, 19], [41, 20]]);
  p.line(42, 21, 45, 22, WOLF_FUR[1]);

  p.outline('#0c0a1a');
}

// ------------------------------------------------------------------ golem

const ROCK = makeRamp('#8a8272', 6, { shadow: '#12101c' });
const MOSS = makeRamp('#5e9a3a', 5, { shadow: '#0e2014' });
const GLOW_EDGE = '#c85a14';
const GLOW = '#ffb43a';
const GLOW_CORE = '#fff2b0';

/** A glowing fissure: dark rim, hot line, white-hot pixels at the joints. */
function crack(p: Painter, pts: readonly Point[]): void {
  p.polyline(GLOW_EDGE, pts.map(([x, y]) => [x + 1, y] as Point));
  p.polyline(GLOW, pts);
  for (const [x, y] of pts.slice(1, -1)) p.dot(x, y, GLOW_CORE);
}

export function drawGolem(p: Painter): void {
  const rock = (bias: number, seed: number) => ({ round: 4, noise: 0.22, noiseScale: 2, noiseSeed: seed, bias });
  // Far arm (shoulder to knuckles) and far leg, in shadow.
  p.shade(boulder(p, 25, 56, 6.5, 6.5, 4, 7), ROCK, rock(-0.15, 5));
  p.shade(boulder(p, 12, 36, 5, 6, 2, 7), ROCK, rock(-0.2, 3));
  p.shade(boulder(p, 10, 46, 5.5, 5, 3, 7), ROCK, rock(-0.2, 4));
  p.shade(boulder(p, 10, 55.5, 7, 6, 11, 8), ROCK, rock(-0.15, 12));
  p.shade(boulder(p, 16, 24, 7.5, 7, 1, 8), ROCK, rock(-0.1, 2));
  // Hips, broad chest, near leg, sunken head.
  p.shade(boulder(p, 32, 45, 10, 6, 12, 8), ROCK, rock(-0.05, 13));
  p.shade(boulder(p, 32, 31, 15, 11, 5, 10), ROCK, rock(0, 6));
  p.shade(boulder(p, 40, 56, 6.5, 6.5, 6, 7), ROCK, rock(0, 7));
  p.shade(boulder(p, 33, 16.5, 6.5, 5.5, 7, 7), ROCK, rock(0.05, 8));
  // Near arm: great shoulder, forearm and a huge fist resting on the ground.
  p.shade(boulder(p, 53, 36, 5.5, 6, 9, 7), ROCK, rock(0, 10));
  p.shade(boulder(p, 55, 46, 6, 5.5, 14, 7), ROCK, rock(0, 15));
  p.shade(boulder(p, 54.5, 56, 8.5, 6.5, 10, 9), ROCK, rock(0.05, 11));
  p.shade(boulder(p, 49, 23, 8, 7.5, 8, 8), ROCK, rock(0, 9));

  // Moss creeping over the upward-facing surfaces, with a few hanging strands.
  const sil = p.silhouette();
  const n = valueNoise(21, 3);
  const tops = sil.subtract(sil.shift(0, 2)).union(sil.subtract(sil.shift(0, 4)).intersect(p.mask((x, y) => n(x, y) > 0.1)));
  p.decal(tops.intersect(p.mask((x, y) => n(x * 1.7, y) > -0.1)), MOSS, { bias: 0.05 });
  for (const [x, y, len] of [[22, 21, 4], [44, 19, 3], [29, 23, 3], [52, 31, 3]] as const) {
    p.line(x, y, x, y + len, MOSS[1]);
    p.dot(x, y, MOSS[3]);
  }

  // Molten eyes and a glowing heart-stone with cracks radiating from it.
  p.flat(p.rect(33, 16, 3, 2).union(p.rect(38, 16, 2, 2)), GLOW);
  p.dots(GLOW_CORE, [[34, 16], [38, 16]]);
  crack(p, [[33, 31], [29, 27], [27, 23]]);
  crack(p, [[33, 31], [38, 27], [40, 23]]);
  crack(p, [[33, 31], [30, 36], [31, 41], [29, 45]]);
  crack(p, [[33, 31], [38, 35], [40, 39]]);
  crack(p, [[54, 53], [57, 56], [55, 59]]);
  p.flat(p.circle(33.5, 31.5, 2.2), GLOW);
  p.flat(p.circle(33.5, 31.5, 1.2), GLOW_CORE);

  p.outline('#100e14');
}
