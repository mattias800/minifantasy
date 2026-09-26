/**
 * Small 32x32 critters: jellies, horned rabbit, sporecap, bat and wisp.
 * All face right; bottom row is the ground line (flyers hover above it).
 */
import { makeRamp, type Ramp } from '../paint/color';
import type { Painter } from '../paint/painter';

// ------------------------------------------------------------------ jelly

export interface JellyPalette {
  body: Ramp;
  /** Deep interior colour visible through the gel. */
  core: Ramp;
  outline: string;
  face: string;
  tongue: string;
}

export const JELLY_GREEN: JellyPalette = {
  body: ['#123a22', '#1d6a2e', '#2f9a3a', '#56c447', '#94e66a', '#d6f8a8'],
  core: ['#0c2a1a', '#15502a', '#227a34', '#3fa53f', '#6fcf57', '#b0ee8a'],
  outline: '#0a1c10',
  face: '#0b2414',
  tongue: '#c8405a',
};

export const JELLY_RED: JellyPalette = {
  body: ['#3e0c12', '#7a1a14', '#b8341a', '#e8662a', '#ffa648', '#ffe29a'],
  core: ['#2c080e', '#5e1210', '#932414', '#cc4a20', '#f58036', '#ffc070'],
  outline: '#1e060a',
  face: '#2a0608',
  tongue: '#ff9a3a',
};

export function drawJelly(p: Painter, pal: JellyPalette): void {
  // Drop silhouette: pointed tip curling left, widest near the bottom, rounded base.
  const body = p.mask((x, y) => {
    const t = (y - 3) / 27;
    if (t < 0 || t > 1) return false;
    const half = t < 0.8 ? 14.5 * Math.sin((t / 0.8) * (Math.PI / 2)) ** 0.85 : 14.5 * Math.sqrt(1 - ((t - 0.8) / 0.32) ** 2);
    const cx = 16 - 4 * (1 - t) ** 4;
    return Math.abs(x - cx) <= half;
  });
  p.shade(body, pal.body, { gloss: 0.5, falloff: 0.1 });
  // A darker "core" floating inside the translucent gel.
  p.decal(p.ellipse(15, 25, 10, 3.5), pal.core, { bias: -0.05 });
  // Subsurface glow along the bottom rim.
  p.adjust(body.intersect(body.shift(0, -2).subtract(body.shift(0, -1)).union(p.rect(0, 29, 32, 1))), 1);

  // Glossy highlight.
  const hi = pal.body[5];
  p.flat(p.ellipse(8.5, 14.5, 2.2, 3).union(p.ellipse(11.5, 10.5, 1.5, 1.2)), hi);
  p.dots(hi, [[4, 20], [4, 21], [5, 22]]);
  p.dots('#ffffff', [[8, 13], [8, 14], [9, 13]]);

  // Face (turned slightly right): scowling brows, big glinting eyes, fanged grin.
  const f = pal.face;
  p.flat(p.rect(14, 15, 3, 4), f);
  p.flat(p.rect(20, 15, 3, 4), f);
  p.dots('#ffffff', [[14, 15], [15, 15], [20, 15], [21, 15]]);
  p.dots(pal.body[3], [[16, 18], [22, 18]]);
  p.dots(f, [[12, 12], [13, 12], [14, 13], [15, 13], [16, 14], [17, 14]]);
  p.dots(f, [[19, 14], [20, 13], [21, 13], [22, 12], [23, 12], [24, 12]]);
  p.flat(p.poly([[13, 21], [25.5, 20.5], [23.5, 25], [15.5, 25]]), f);
  p.flat(p.ellipse(19.5, 24.5, 3, 1.2), pal.tongue);
  p.dots('#fff8e8', [[15, 21], [15, 22], [16, 22], [22, 21], [23, 21], [23, 22]]);

  p.outline(pal.outline);
}

// ------------------------------------------------------------- hornrabbit

const RABBIT_FUR = makeRamp('#b47c4c', 6, { shadow: '#2a1022' });
const RABBIT_BELLY = makeRamp('#ecdcb8', 5, { shadow: '#5a3a3a' });
const RABBIT_EAR = makeRamp('#d88b86', 5);
const HORN = makeRamp('#e8dcb8', 5, { shadow: '#3a2418' });

export function drawHornRabbit(p: Painter): void {
  // Far ear (tucked behind).
  p.shade(p.capsule(18, 8, 10, 2, 2.2, 1.5), RABBIT_FUR, { bias: -0.15 });
  // Haunch, body and chest, crouched ready to pounce.
  p.shade(p.ellipse(10, 21, 8.5, 8).union(p.ellipse(16, 20.5, 7, 6.5), p.ellipse(20, 21.5, 4.5, 5.5)), RABBIT_FUR);
  p.decal(p.ellipse(21, 24.5, 3.5, 4), RABBIT_BELLY);
  p.shade(p.ellipse(10, 28.5, 6.5, 1.8), RABBIT_FUR, { bias: -0.05 }); // hind foot
  p.shade(p.circle(2.5, 18, 2.4), RABBIT_BELLY); // tail puff
  // Front paws.
  p.shade(p.capsule(20.5, 25, 21, 28.5, 1.6).union(p.ellipse(22, 28.5, 2, 1.2)), RABBIT_FUR);
  p.shade(p.capsule(24, 24.5, 25, 28.5, 1.6).union(p.ellipse(26, 28.5, 2, 1.2)), RABBIT_FUR);
  // Head with muzzle and pale cheek.
  p.shade(p.ellipse(23, 12.5, 5.5, 5).union(p.ellipse(27.5, 15, 3.2, 2.8)), RABBIT_FUR);
  p.decal(p.ellipse(26.5, 16.5, 3.2, 2), RABBIT_BELLY);
  // Near ear, laid back aggressively.
  p.shade(p.capsule(20, 9, 9, 4, 2.4, 1.7), RABBIT_FUR);
  p.decal(p.capsule(19.5, 9, 10.5, 4.8, 1, 0.7), RABBIT_EAR, { bias: -0.05 });
  // Spiral horn from the forehead.
  p.shade(p.capsule(25, 8.5, 30, 1, 2, 0.5), HORN, { gloss: 0.4 });
  for (let t = 0; t < 3; t++) p.dot(Math.round(26 + t * 1.3), 7 - t * 2, HORN[1]);

  // Feral red eye under a scowling brow, nose, snarling mouth with incisors.
  p.flat(p.rect(24, 11, 2, 3), '#d01c1c');
  p.dot(24, 11, '#ffd0a0');
  p.dot(25, 13, '#400606');
  p.line(22, 10, 26, 11, '#3a1e12');
  p.dot(30, 14, '#6a2a2a');
  p.flat(p.poly([[25.5, 17], [30, 16.5], [29, 19], [26, 19]]), '#3a0e10');
  p.flat(p.rect(27, 17, 2, 2), '#fffbee');
  p.dot(28, 18, '#c8bca0');

  p.outline('#26140c');
}

// --------------------------------------------------------------- sporecap

const CAP = makeRamp('#8e3c9e', 6);
const STALK = makeRamp('#e6d8b8', 6, { shadow: '#3a2240' });
const GILLS = makeRamp('#9a7a78', 4, { shadow: '#2a1428' });
const SPOTS = makeRamp('#f2eaa0', 4, { shadow: '#6a4a6a' });

export function drawSporecap(p: Painter): void {
  // Stubby feet and arms.
  p.shade(p.ellipse(12, 28.5, 3.5, 1.8), STALK, { bias: -0.1 });
  p.shade(p.ellipse(20.5, 28.5, 3.5, 1.8), STALK, { bias: -0.05 });
  p.shade(p.capsule(10, 20, 6.5, 24.5, 1.5, 1.3), STALK, { bias: -0.1 });
  // Stalk body.
  p.shade(p.ellipse(16, 22, 6, 6.5), STALK);
  p.shade(p.capsule(22, 20, 26, 23.5, 1.5, 1.3), STALK);
  // Gills under the cap, then the spotted cap itself.
  p.shade(p.ellipse(16, 15, 11, 2.5), GILLS, { round: 2 });
  for (let x = 8; x <= 24; x += 2) p.dot(x, 15, GILLS[0]);
  const cap = p.ellipse(16, 11.5, 13, 9).subtract(p.rect(0, 14, 32, 18)).union(p.ellipse(16, 13, 14, 2.4));
  p.shade(cap, CAP, { gloss: 0.3 });
  const spots = p
    .circle(9.5, 7.5, 2.2)
    .union(p.circle(17, 5, 1.8), p.circle(22.5, 9, 2.4), p.circle(5.5, 12, 1.4), p.circle(14, 10.5, 1.6), p.circle(27, 12, 1.3))
    .intersect(cap);
  p.decal(spots, SPOTS, { bias: 0.1 });

  // Face in the cap's shadow: glowing eyes and a wicked grin.
  p.adjust(p.rect(8, 16, 16, 2), -1);
  p.flat(p.rect(16, 18, 3, 3), '#1e0e22');
  p.flat(p.rect(21, 18, 3, 3), '#1e0e22');
  p.dots('#f0ff80', [[17, 19], [22, 19]]);
  p.dots('#a8c040', [[17, 20], [22, 20]]);
  p.flat(p.poly([[16, 23], [24, 22.5], [23, 25], [17, 25]]), '#2e1028');
  p.dots(STALK[5], [[17, 23], [19, 23], [21, 23], [23, 23]]);

  p.outline('#1a0a1e');

  // Drifting spores (after the outline so they stay single glowing pixels).
  p.dots('#d8f070', [[3, 4], [28, 3], [30, 18], [2, 21], [25, 1]]);
  p.dots('#8aa040', [[4, 4], [28, 4], [2, 22]]);
}

// -------------------------------------------------------------------- bat

const WING = makeRamp('#6e3c8e', 6);
const BAT_FUR = makeRamp('#553068', 6, { light: 0.45 });

export function drawBat(p: Painter): void {
  const farWing = p.poly([[14, 11], [9, 5], [4, 4], [0, 7], [2, 12], [4, 11.5], [5, 16], [8, 14], [10, 19], [13, 16], [15, 17]]);
  const nearWing = p.poly([[19, 11], [24, 4], [29, 3], [31.5, 6], [30, 12], [28, 11.5], [27, 16], [24, 14], [22, 19], [20, 16], [18, 17]]);
  p.shade(farWing, WING, { round: 3, bias: -0.1 });
  p.shade(nearWing, WING, { round: 3 });
  // Finger bones fanning out from each wrist.
  const bone = WING[4];
  p.polyline(bone, [[14, 11], [9, 5], [1, 7]]);
  p.line(9, 5, 4, 11, bone);
  p.line(9, 6, 8, 13, bone);
  p.polyline(bone, [[19, 11], [24, 4], [30, 5]]);
  p.line(24, 4, 29, 11, bone);
  p.line(24, 5, 25, 14, bone);

  // Body, head and ears.
  p.shade(p.ellipse(16.5, 15.5, 4, 5.5), BAT_FUR);
  p.shade(p.poly([[15, 8], [14, 2], [18, 6.5]]).union(p.poly([[19, 7], [22.5, 1.5], [22, 8.5]])), BAT_FUR);
  p.dots('#c86a9a', [[15, 5], [15, 6], [21, 5], [21, 6]]);
  p.shade(p.circle(18.5, 9.5, 3.5), BAT_FUR);
  // Tiny clawed feet.
  p.dots(BAT_FUR[1], [[15, 21], [15, 22], [18, 21], [18, 22]]);

  // Glowing red eyes, snout and fangs.
  p.dots('#ff3030', [[17, 9], [20, 9]]);
  p.dots('#ffd0a0', [[17, 8], [20, 8]]);
  p.dot(21, 11, '#2a0e30');
  p.dots('#ffffff', [[18, 12], [20, 12]]);
  p.dot(19, 12, '#2a0e30');

  p.outline('#140a1e');
}

// ------------------------------------------------------------------- wisp

const WISP = ['#1c3478', '#2d56b0', '#4c8ce0', '#80c4f4', '#bce8ff', '#f2ffff'] as const;

export function drawWisp(p: Painter): void {
  // Flame tongues curl back-left as it drifts towards the party; a tail trails behind.
  const flame = p
    .circle(16, 20, 7)
    .union(
      p.path([[16, 19, 6], [15, 13, 4.5], [13, 8, 2.8], [14, 4, 1.4], [17, 1.5, 0.5]], 4),
      p.path([[11, 18, 3], [8, 13, 1.8], [8.5, 9, 0.6]], 4),
      p.path([[21, 17, 3], [23.5, 12, 1.6], [22.5, 8, 0.5]], 4),
      p.path([[12, 24, 3.5], [8, 26.5, 2], [4, 25.5, 1], [1.5, 23.5, 0.5]], 4),
    );
  p.shade(flame, WISP, { gloss: 0.2, falloff: 0.1, bias: -0.1, dither: 0.8, crease: 0 });
  // White-hot heart.
  p.decal(p.ellipse(16.5, 19.5, 4.5, 4.5).union(p.ellipse(15.5, 13, 2, 4)), WISP, { bias: 0.3, dither: 0.9 });

  // Hollow, mournful face.
  p.flat(p.ellipse(15, 18.5, 1.2, 2), '#14215a');
  p.flat(p.ellipse(20, 18.5, 1.2, 2), '#14215a');
  p.flat(p.ellipse(18, 23, 1.1, 1.4), '#14215a');

  p.outline('#0e1a4a');

  // Cold sparks.
  p.dots(WISP[4], [[5, 9], [27, 4], [28, 14], [4, 18], [21, 29]]);
  p.dots(WISP[2], [[5, 10], [27, 5], [22, 29]]);
}
