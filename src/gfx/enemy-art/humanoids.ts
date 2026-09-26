/**
 * Bipedal foes: goblin raider (48x48), skeleton warrior (48x48) and the cave
 * troll mini-boss (64x64). All face right, drawn back-to-front: far limbs and
 * weapons first, then torso, head and near limbs.
 */
import { makeRamp } from '../paint/color';
import type { Painter } from '../paint/painter';

const WOOD = makeRamp('#8a5a32', 6, { shadow: '#1e0e14' });
const STEEL = makeRamp('#a2a8b4', 6, { shadow: '#161428', highlight: '#ffffff' });
const IRON = makeRamp('#6e6260', 5, { shadow: '#140c14' });
const RUST = makeRamp('#9a4a24', 5, { shadow: '#2a0c10' });

// ----------------------------------------------------------------- goblin

const GOB_SKIN = makeRamp('#76a846', 6, { shadow: '#101a24' });
const GOB_RAGS = makeRamp('#8a7048', 5, { shadow: '#1e1018' });
const GOB_PATCH = makeRamp('#6a3e3a', 5, { shadow: '#1e0c14' });

export function drawGoblin(p: Painter): void {
  // Spiked club raised in the far hand.
  p.shade(p.capsule(15, 25, 10, 9, 1.3), WOOD);
  p.shade(p.capsule(10.5, 11, 6.5, 3, 2.6, 3.6), WOOD, { noise: 0.2 });
  p.dots(STEEL[4], [[4, 4], [9, 3], [6, 8], [10, 7]]);
  p.dots(STEEL[1], [[4, 5], [9, 4], [6, 9], [10, 8]]);
  // Far arm and fist around the club.
  p.shade(p.capsule(21, 23, 15, 22, 2.2, 1.8), GOB_SKIN, { bias: -0.15 });
  p.shade(p.circle(14, 21.5, 2.3), GOB_SKIN, { bias: -0.05 });
  // Far leg.
  p.shade(p.capsule(21, 35, 17, 40, 2.6, 2.1).union(p.capsule(17, 40, 16, 45, 2.1, 1.8), p.ellipse(18, 45.5, 3.5, 1.5)), GOB_SKIN, { bias: -0.2 });
  // Far ear, behind the head.
  p.shade(p.poly([[34, 11], [41, 3], [38, 13]]), GOB_SKIN, { bias: -0.15, round: 2 });

  // Hunched torso wrapped in rags with a jagged hem.
  p.shade(p.ellipse(24, 30, 7.5, 7.5).union(p.ellipse(27, 24, 6, 5)), GOB_SKIN);
  const rags = p.poly([
    [17, 27], [22, 21], [31, 21.5], [33, 28], [32.5, 35], [30.5, 38], [28.5, 35], [26, 39], [24, 35.5], [21, 38.5], [19, 35], [16.5, 36.5],
  ]);
  p.shade(rags, GOB_RAGS, { noise: 0.15 });
  p.decal(p.rect(20, 26, 4, 4).intersect(rags), GOB_PATCH);
  p.flat(p.rect(17, 31, 16, 1).intersect(rags), GOB_RAGS[0]);
  p.dots(GOB_RAGS[4], [[21, 27], [23, 29]]);

  // Near leg.
  p.shade(p.capsule(27, 35, 31, 40, 2.9, 2.3).union(p.capsule(31, 40, 30, 45, 2.3, 2), p.ellipse(33, 45.5, 3.8, 1.6)), GOB_SKIN);

  // Head: skull, jutting jaw, hooked nose, long near ear.
  p.shade(p.ellipse(31, 15, 7, 6.5).union(p.ellipse(33, 19, 5.5, 3.5)), GOB_SKIN);
  p.shade(p.ellipse(38.5, 15.5, 2.6, 2.1).union(p.capsule(37, 14, 40.5, 17.5, 1.3, 1)), GOB_SKIN, { gloss: 0.3 });
  p.shade(p.poly([[28, 12.5], [15, 6], [18, 10.5], [27.5, 17.5]]), GOB_SKIN, { round: 2 });
  p.line(26, 13, 19, 9, GOB_SKIN[1]);

  // Mean yellow eye under a heavy brow.
  p.flat(p.rect(33, 12, 3, 2), '#f8e048');
  p.dot(35, 13, '#901010');
  p.dot(35, 12, '#c02a10');
  p.polyline(GOB_SKIN[0], [[31, 10], [33, 10], [35, 11], [37, 12]]);
  // Toothy grin.
  p.flat(p.poly([[32, 19], [39.5, 18.5], [38, 21.5], [33, 21.5]]), '#2a0a10');
  p.dots('#fff4d0', [[33, 19], [35, 19], [37, 19], [34, 21], [36, 21], [38, 20]]);

  // Near arm thrusting a rusty dagger.
  p.shade(p.capsule(46.5, 26, 40, 29.5, 0.4, 1.3), STEEL, { gloss: 0.6, crease: 0 });
  p.decal(p.circle(42, 29, 1.2), RUST);
  p.line(38, 27, 39, 32, IRON[1]);
  p.shade(p.capsule(29, 24, 33, 30, 2.4, 2.1).union(p.capsule(33, 30, 37, 30, 2.1, 1.9)), GOB_SKIN);
  p.shade(p.circle(37.5, 30, 2.3), GOB_SKIN);

  p.outline('#12200c');
}

// --------------------------------------------------------------- skeleton

const BONE = makeRamp('#dccfa8', 6, { shadow: '#2a1c2a' });
const CLOTH = makeRamp('#7a2a34', 5, { shadow: '#1a0814' });

export function drawSkeleton(p: Painter): void {
  // Sword raised back in the far hand.
  p.shade(p.capsule(13.5, 16.5, 5, 2, 1.6, 0.7), STEEL, { gloss: 0.5 });
  p.decal(p.circle(10, 10, 1.5).union(p.circle(7, 5, 1)), RUST, { bias: 0.1 });
  p.line(13, 17, 8, 8, STEEL[5]);
  p.shade(p.capsule(11.5, 19.5, 17.5, 15.5, 1.1), IRON);
  p.shade(p.capsule(15, 19, 16.5, 21.5, 0.9), WOOD);
  // Far arm bones.
  p.shade(p.capsule(21, 21, 17, 24, 1.2).union(p.capsule(17, 24, 15.5, 19.5, 1.1)), BONE, { bias: -0.2 });
  p.shade(p.circle(15.5, 19.5, 1.7), BONE, { bias: -0.1 });
  // Far leg.
  p.shade(p.capsule(22, 34, 20, 40, 1.3).union(p.capsule(20, 40, 20, 45, 1.2), p.ellipse(22, 45.5, 2.6, 1.1), p.circle(20, 40, 1.8)), BONE, { bias: -0.2 });

  // Spine, ribcage and pelvis.
  p.shade(p.capsule(25, 22, 25, 33, 1.2), BONE);
  const ribs = p.ellipse(26.5, 25.5, 6, 5);
  p.shade(ribs, BONE);
  for (const y of [23, 25, 27, 29]) p.flat(p.rect(21, y, 12, 1).intersect(p.ellipse(26.5, 25.5, 4.8, 4.2)).subtract(p.rect(24, 0, 2, 48)), '#1c1218');
  p.shade(p.ellipse(25.5, 33, 4.5, 2.5), BONE);

  // Tattered cloth skirt under an iron belt.
  const skirt = p.poly([[20, 32], [31, 32], [32.5, 38], [30.5, 37], [28.5, 39.5], [26.5, 37], [24.5, 39.5], [22.5, 37], [20, 38]]);
  p.shade(skirt, CLOTH, { noise: 0.15 });
  p.shade(p.rect(20, 31, 12, 2), IRON, { round: 1 });
  p.dot(26, 31, RUST[3]);

  // Near leg.
  p.shade(p.capsule(28, 35, 31, 40, 1.4).union(p.capsule(31, 40, 30, 45, 1.3), p.ellipse(32.5, 45.5, 2.8, 1.1), p.circle(31, 40, 1.9)), BONE);

  // Skull with a dented, rusty helm.
  p.shade(p.circle(28, 12.5, 5.5).union(p.ellipse(30, 17, 3.5, 2)), BONE);
  const helm = p.ellipse(28, 10, 6.5, 5).subtract(p.rect(0, 11, 48, 40)).union(p.rect(21.5, 9, 13, 2));
  p.shade(helm, IRON, { noise: 0.2 });
  p.decal(p.circle(25, 7, 1.5).union(p.circle(31, 9, 1.2)), RUST);
  p.shade(p.rect(29, 9, 2, 5), IRON, { round: 1 }); // nasal guard
  // Glowing eye sockets, nasal cavity, teeth.
  p.flat(p.ellipse(26.5, 13, 1.6, 1.6).union(p.ellipse(32, 13, 1.3, 1.6)), '#1c1218');
  p.dots('#ff3a28', [[26, 13], [32, 13]]);
  p.dot(26, 12, '#ffc0a0');
  p.dots('#1c1218', [[31, 16], [29, 17], [31, 17], [33, 17]]);
  p.line(28, 18, 33, 18, BONE[1]);

  // Pauldron and the round shield on the near arm.
  p.shade(p.ellipse(31, 21, 4, 3), IRON, { noise: 0.15 });
  const shield = p.circle(35, 29, 7.5);
  p.shade(shield, WOOD, { noise: 0.1 });
  for (const x of [32, 35, 38]) p.adjust(p.rect(x, 20, 1, 18).intersect(shield), -1);
  p.flat(shield.edge(), IRON[1]);
  p.adjust(shield.edge().intersect(p.rect(0, 0, 35, 29)), 2);
  p.shade(p.circle(35, 29, 2.3), IRON, { gloss: 0.6 });
  p.decal(p.circle(39, 33, 1.8).union(p.circle(31, 25, 1.2)), RUST);

  p.outline('#140c12');
}

// ------------------------------------------------------------------ troll

const TROLL_SKIN = makeRamp('#7c8a62', 6, { shadow: '#10141e' });
const TROLL_BELLY = makeRamp('#a8a67a', 6, { shadow: '#1e1a1e' });
const HIDE = makeRamp('#7a5436', 5, { shadow: '#1a0c10' });
const TUSK = makeRamp('#efe6c8', 4, { shadow: '#4a3a30' });

export function drawTroll(p: Painter): void {
  const skin = { noise: 0.14, noiseScale: 2, noiseSeed: 7 };
  // Far arm hanging low, knuckles near the ground.
  p.shade(p.capsule(17, 27, 11, 42, 5, 4).union(p.capsule(11, 42, 10, 52, 4.2, 3.8)), TROLL_SKIN, { ...skin, bias: -0.18 });
  p.shade(p.circle(10, 54.5, 4.5), TROLL_SKIN, { ...skin, bias: -0.12 });
  // Far leg.
  p.shade(p.capsule(24, 50, 21, 59, 5, 4).union(p.ellipse(21, 60.5, 5.5, 2)), TROLL_SKIN, { ...skin, bias: -0.2 });

  // Massive hunched torso and pot belly.
  p.shade(p.ellipse(30, 39, 15.5, 14.5).union(p.ellipse(28, 26, 15, 10)), TROLL_SKIN, skin);
  p.decal(p.ellipse(35, 44, 9, 8), TROLL_BELLY, { bias: 0.05 });
  p.dots(TROLL_SKIN[1], [[22, 22], [30, 20], [18, 30], [26, 33]]); // warts
  // Hide loincloth.
  const cloth = p.poly([[17, 47], [43, 47], [41, 57], [35, 54], [30, 58.5], [25, 54], [19, 56]]);
  p.shade(cloth, HIDE, { noise: 0.15 });
  p.flat(p.rect(17, 47, 26, 1).intersect(cloth), HIDE[0]);
  // Near leg.
  p.shade(p.capsule(36, 52, 40, 59, 5.5, 4.5).union(p.ellipse(42, 60.5, 6, 2)), TROLL_SKIN, skin);

  // Small head thrust forward: skull, heavy brow, bulbous nose, underbite with tusks.
  p.shade(p.poly([[39, 20], [33, 14.5], [40.5, 24]]), TROLL_SKIN, { bias: -0.1, round: 2 }); // ear
  p.shade(p.ellipse(44, 24, 7, 6.5), TROLL_SKIN, skin);
  p.shade(p.ellipse(46.5, 30, 6, 3.5), TROLL_SKIN, { ...skin, bias: -0.05 });
  p.shade(p.ellipse(47, 20, 6, 2.5), TROLL_SKIN, { bias: 0.1 });
  p.shade(p.ellipse(51.5, 25, 3, 2.8), TROLL_SKIN, { gloss: 0.4 });
  p.flat(p.rect(45, 22, 2, 2).union(p.rect(49, 22, 2, 1)), '#1a1008');
  p.dots('#ffd23a', [[45, 22], [49, 22]]);
  p.line(43, 28, 50, 28, '#2a1418');
  p.shade(p.capsule(45, 29, 44.5, 25.5, 1.1, 0.5).union(p.capsule(50, 29, 50.5, 25.5, 1.1, 0.5)), TUSK, { crease: 0 });
  p.polyline('#26221e', [[38, 18], [40, 15], [42, 17], [44, 14], [46, 17]]); // scraggly hair

  // Huge spiked club dragged at its side, gripped by the near arm.
  p.shade(p.capsule(47, 42, 58, 58, 2.2, 5.5), WOOD, { noise: 0.2, noiseSeed: 3 });
  p.dots(STEEL[4], [[55, 50], [60, 54], [57, 57], [53, 54], [61, 58]]);
  p.dots(STEEL[1], [[55, 51], [60, 55], [53, 55]]);
  p.line(52, 50, 56, 56, WOOD[1]);
  p.shade(p.ellipse(40, 30, 6, 5).union(p.capsule(40, 31, 46, 40, 5, 4.5)), TROLL_SKIN, skin);
  p.shade(p.circle(48, 43.5, 4.5), TROLL_SKIN, skin);
  p.line(46, 42, 50, 44, TROLL_SKIN[1]);

  p.outline('#121410');
}
