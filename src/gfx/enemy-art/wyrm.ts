/**
 * FINAL BOSS — the Umbral Wyrm (112x96).
 *
 * A shadow-scaled serpentine dragon rearing up in an S-curve: tail coiled on
 * the ground at the left, body rising into a long neck and a roaring,
 * horned head at the upper right. Violet crystal shards jut from its spine and
 * tattered wings spread behind it. Scales and belly plates follow the body
 * curve via an arc-length parameterisation of the spine.
 */
import { makeRamp, type Ramp } from '../paint/color';
import { smoothPath, type Point } from '../paint/mask';
import type { Painter } from '../paint/painter';
import { crystal } from '../paint/props';

const SCALES: Ramp = ['#0c0716', '#1b1030', '#2c1a4a', '#432a68', '#5e3c8a', '#8462b4'];
const BELLY: Ramp = ['#1e0e22', '#3a2040', '#5a3658', '#7a5074', '#9c7090', '#c09ab0'];
const MEMBRANE: Ramp = ['#0e0616', '#1c0c26', '#2e1438', '#44204c', '#5e2e62', '#7c4280'];
const CRYSTAL: Ramp = ['#1e0838', '#3e1470', '#6424b0', '#8c44e0', '#b47cff', '#e4ccff'];
const HORN = makeRamp('#6a5a6e', 5, { shadow: '#0a0610', highlight: '#e8dcf0' });
const EYE = '#ff2a4a';
const EYE_CORE = '#ffe0ea';
const MAW = '#2e0816';
const TOOTH = '#f4ecf8';

/** Spine from tail tip to the base of the skull: [x, y, radius]. */
const SPINE: readonly (readonly [number, number, number])[] = [
  [9, 73, 1.2], [5, 80, 2.5], [9, 87, 4], [20, 90, 6], [34, 89, 8], [48, 85, 10.5], [60, 78, 12],
  [68, 67, 12.5], [68, 55, 12], [62, 45, 11], [60, 36, 10], [64, 28, 9], [72, 23, 8],
];

interface SpineSample {
  x: number;
  y: number;
  r: number;
  /** Arc length from the tail tip. */
  s: number;
  /** Unit normal pointing to the belly side (right-hand side of travel). */
  nx: number;
  ny: number;
}

function sampleSpine(): SpineSample[] {
  const pts = smoothPath(SPINE, 8);
  let s = 0;
  return pts.map(([x, y, r], i) => {
    if (i > 0) s += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    return { x, y, r, s, nx: -(by - ay) / len, ny: (bx - ax) / len };
  });
}

/** Body-space coordinates of a pixel: arc length along the spine and signed offset towards the belly (in radii). */
function bodyCoords(spine: SpineSample[], x: number, y: number): { s: number; q: number } {
  let best = spine[0];
  let bestD = Infinity;
  for (const sp of spine) {
    const d = (sp.x - x) ** 2 + (sp.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = sp;
    }
  }
  const q = ((x - best.x) * best.nx + (y - best.y) * best.ny) / best.r;
  return { s: best.s, q };
}

function drawWings(p: Painter): void {
  // Far wing peeking up behind the neck.
  const far = p.poly([[64, 36], [72, 18], [84, 2], [86, 10], [82, 16], [84, 22], [78, 26], [76, 34]]);
  p.shade(far, MEMBRANE, { round: 3, bias: -0.2 });
  p.polyline(SCALES[3], [[66, 34], [74, 17], [84, 3]]);

  // Near wing: arm bone shoulder -> elbow -> wrist, then finger bones fanning out
  // to the tips with scalloped membrane panels between them.
  const shoulder: Point = [60, 42], elbow: Point = [44, 17], wrist: Point = [30, 7];
  const tips: Point[] = [[3, 3], [3, 23], [12, 37], [30, 45]];
  const valleys: Point[] = [[14, 15], [16, 29], [27, 37], [47, 45]];
  for (let i = 0; i < tips.length; i++) {
    const panel = i + 1 < tips.length ? [wrist, tips[i], valleys[i], tips[i + 1]] : [wrist, tips[i], valleys[i], shoulder, elbow];
    p.shade(p.poly(panel), MEMBRANE, { round: 5, bias: 0.12 - i * 0.06, noise: 0.08, shadow: 0 });
  }
  p.shade(p.poly([wrist, [24, 2], tips[0]]), MEMBRANE, { round: 3, bias: 0.15, shadow: 0 });
  for (const t of tips.slice(1)) p.shade(p.capsule(wrist[0], wrist[1], t[0], t[1], 1.1, 0.5), SCALES, { crease: 0, shadow: 0, bias: 0.15 });
  p.shade(p.path([[...shoulder, 2.6], [...elbow, 2], [...wrist, 1.6], [...tips[0], 0.6]]), SCALES, { crease: 0, bias: 0.15 });
  p.shade(p.circle(wrist[0], wrist[1], 2), HORN); // wing claw knuckle
}

function drawBody(p: Painter, spine: SpineSample[]): void {
  // Back crystals first, so their roots sink into the body drawn over them.
  const total = spine[spine.length - 1].s;
  for (let s = 14, i = 0; s < total - 8; s += 7, i++) {
    const sp = spine.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a));
    const k = Math.max(0.15, 1 - Math.abs(s - total * 0.72) / (total * 0.6)); // biggest over the shoulders
    const len = (4 + 11 * k) * (i % 2 ? 0.65 : 1);
    const tail = spine[Math.max(0, spine.indexOf(sp) - 3)];
    const tx = sp.x - tail.x, ty = sp.y - tail.y, tl = Math.hypot(tx, ty) || 1;
    const dx = -sp.nx - (tx / tl) * 0.35, dy = -sp.ny - (ty / tl) * 0.35;
    const dl = Math.hypot(dx, dy);
    const bx = sp.x - sp.nx * sp.r * 0.55, by = sp.y - sp.ny * sp.r * 0.55;
    crystal(p, bx, by, bx + (dx / dl) * (len + sp.r * 0.5), by + (dy / dl) * (len + sp.r * 0.5), 1.2 + 1.6 * k, CRYSTAL);
  }

  const body = p.path(spine.map((sp) => [sp.x, sp.y, sp.r] as const));
  p.shade(body, SCALES, { contrast: 1, falloff: 0.15 });

  // Belly plates on the inner side, and overlapping scale rows elsewhere.
  const coords = new Map<number, { s: number; q: number }>();
  const at = (x: number, y: number) => {
    const key = y * p.w + x;
    let c = coords.get(key);
    if (!c) coords.set(key, (c = bodyCoords(spine, x + 0.5, y + 0.5)));
    return c;
  };
  const belly = body.intersect(p.mask((x, y) => at(Math.floor(x), Math.floor(y)).q > 0.3));
  p.decal(belly, BELLY, { bias: 0.05 });
  p.adjust(belly.intersect(p.mask((x, y) => at(Math.floor(x), Math.floor(y)).s % 4 < 1)), -1);
  const scaleRims = body.subtract(belly).intersect(
    p.mask((fx, fy) => {
      const { s, q } = at(Math.floor(fx), Math.floor(fy));
      const row = Math.floor(q * 2.6 + 8);
      const u = (s + (row & 1) * 2.2) % 4.4;
      return u < 0.9 || ((q * 2.6 + 8) % 1 < 0.2 && u < 3);
    }),
  );
  p.adjust(scaleRims, -1);
  // Violet rim light from the crystals along the back edge, so it reads against dark caves.
  const backRim = body.edge().intersect(p.mask((x, y) => at(Math.floor(x), Math.floor(y)).q < -0.5));
  p.adjust(backRim, 2);
}

function drawForeleg(p: Painter): void {
  const leg = p.capsule(71, 60, 80, 77, 5.5, 3.8).union(p.capsule(80, 77, 83, 89, 3.8, 2.8));
  p.shade(leg, SCALES, { bias: 0.05 });
  p.shade(p.ellipse(86, 91.5, 5.5, 2.5), SCALES);
  // Talons.
  for (const [x, y] of [[88, 93], [91, 92], [84, 94]] as const) {
    p.line(x, y - 1, x + 2, y, HORN[3]);
    p.dot(x + 2, y, HORN[4]);
  }
}

function drawHead(p: Painter): void {
  // Swept-back horns.
  p.shade(p.path([[82, 15, 2.6], [74, 8, 2], [66, 4, 1.3], [59, 5, 0.5]], 4), HORN, { gloss: 0.3 });
  p.shade(p.path([[79, 20, 2], [70, 16, 1.5], [62, 17, 0.5]], 4), HORN, { bias: -0.15 });

  // Open maw with a faint violet glow deep in the throat.
  p.flat(p.poly([[82, 23], [108, 24], [104, 34], [84, 32]]), MAW);
  p.flat(p.ellipse(87, 28, 3.5, 2.5), '#6a1a4a');
  p.flat(p.ellipse(86.5, 28, 1.8, 1.2), '#b0408a');

  // Lower jaw, then skull and snout over it.
  p.shade(p.poly([[75, 27], [86, 30], [103, 33], [105, 36.5], [90, 37.5], [78, 34]]), SCALES, { round: 3, bias: -0.05 });
  p.decal(p.poly([[80, 33], [104, 34.5], [104, 36.5], [90, 37.5], [80, 35.5]]), BELLY, { bias: 0.05 });
  const skull = p.poly([[71, 17], [79, 11], [90, 11.5], [100, 15], [109, 19.5], [109.5, 24], [97, 25], [85, 25.5], [74, 28]]);
  p.shade(skull, SCALES, { round: 5, gloss: 0.2 });
  p.shade(p.ellipse(89, 15.5, 6, 2.2), SCALES, { round: 2, bias: 0.12 }); // brow ridge
  // Jaw-hinge spikes and a pair of crystal shards on the crown.
  p.shade(p.poly([[76, 27], [66, 31], [75, 31]]).union(p.poly([[78, 31], [70, 37], [80, 34]])), HORN, { bias: -0.1, round: 2 });
  crystal(p, 80, 13, 76, 3, 1.6, CRYSTAL);
  crystal(p, 85, 12, 84, 5, 1.2, CRYSTAL);

  // Teeth.
  for (let x = 89; x <= 105; x += 3) p.flat(p.poly([[x, 24], [x + 2, 24], [x + 1, 27.5]]), TOOTH);
  for (let x = 88; x <= 102; x += 3) p.flat(p.poly([[x, 33.5], [x + 2, 33.5], [x + 1, 30]]), TOOTH);
  p.flat(p.poly([[103, 24], [106, 24], [104, 29]]), TOOTH); // fang

  // Nostril smouldering, and the burning eye.
  p.dots('#0a0612', [[106, 19], [107, 19]]);
  p.dot(107, 18, '#b0408a');
  p.flat(p.poly([[85, 17.5], [93, 16.5], [92, 19.5], [87, 19.5]]), EYE);
  p.dots(EYE_CORE, [[89, 18], [90, 18]]);
  p.dots('#ff9ab0', [[88, 17], [91, 17]]);
  p.line(84, 16, 94, 15, SCALES[0]);
}

export function drawWyrm(p: Painter): void {
  const spine = sampleSpine();
  drawWings(p);
  drawBody(p, spine);
  drawForeleg(p);
  drawHead(p);
  p.outline('#07040c');

  // Motes of umbral light drifting around it.
  p.dots(CRYSTAL[4], [[40, 58], [96, 48], [104, 6], [30, 70], [88, 62], [50, 4]]);
  p.dots(CRYSTAL[2], [[41, 58], [97, 49], [30, 71], [101, 60], [22, 52]]);
}
