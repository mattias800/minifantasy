/**
 * Colour palettes for every character sprite.
 *
 * All character grids share one set of palette *slots* (single letters) so that
 * templates can be reused between characters with different colours:
 *
 *   o  outline            e  eyes / dark facial detail
 *   s  skin               S  skin shade (the mage: gloves)
 *   h  hair light         H  hair mid          k  hair dark
 *   a  main cloth light   A  main cloth mid    n  main cloth dark
 *   c  second cloth light C  second cloth dark
 *   r  accent light       R  accent dark
 *   m  metal light        M  metal mid         N  metal dark
 *   l  leather/wood light L  leather/wood dark
 *   w  white / highlight  W  white shade
 *   y  gold               Y  gold dark
 *   g  gem / glow light   G  gem / glow dark
 *   x  face shadow (mage) z  glowing eyes (mage)
 *
 * The light source is top-left: lighter shades go on upper-left edges.
 */
import type { Palette } from '../pixelart';

/** Shared outline: a deep plum rather than pure black, like most SNES sprites. */
export const OUTLINE = '#1e1628';

const BASE: Palette = {
  o: OUTLINE,
  e: '#261c3c',
  s: '#f8cca4',
  S: '#d8946c',
  w: '#f8f8f0',
  W: '#c4c4d8',
  y: '#f8d060',
  Y: '#b88828',
  m: '#e8ecf4',
  M: '#a4aec4',
  N: '#646c88',
  l: '#a86c3c',
  L: '#6c4424',
};

function palette(overrides: Palette): Palette {
  return { ...BASE, ...overrides };
}

/** Kael — young knight: auburn hair, blue tunic, steel pauldrons, red scarf. */
export const HERO = palette({
  h: '#e08040',
  H: '#b05424',
  k: '#70301c',
  a: '#5c98e8',
  A: '#3864b8',
  n: '#24387c',
  r: '#f05040',
  R: '#b02830',
  g: '#fff8b0',
  G: '#f8c840',
});

/** Lyra — healer: pale golden hair, white robe with teal trim, gold circlet, ringed staff. */
export const CLERIC = palette({
  h: '#fcec9c',
  H: '#e0b85c',
  k: '#a8783c',
  a: '#f8f8f0',
  A: '#cccce0',
  n: '#8c8cb0',
  c: '#48d0b0',
  C: '#20907c',
  g: '#a8f4ff',
  G: '#40a8d8',
});

/** Orrin — arcanist: indigo robe and wide hat, amber scarf, shadowed face with glowing eyes. */
export const MAGE = palette({
  a: '#7c68d8',
  A: '#5240a4',
  n: '#30246c',
  h: '#5c4cb8',
  H: '#3c2e88',
  k: '#221a52',
  r: '#e87c3c',
  R: '#a8482c',
  x: '#140c20',
  z: '#fff070',
  s: '#6c4c8c',
  S: '#44306a',
  g: '#ff6890',
  G: '#b02858',
});

export const ELDER = palette({
  h: '#f8f8f8',
  H: '#c8c8d4',
  k: '#8c8ca4',
  a: '#a05870',
  A: '#743c54',
  n: '#4c2438',
  c: '#e8c870',
  C: '#b08c40',
});

export const MAN = palette({
  h: '#946034',
  H: '#6c4020',
  k: '#442614',
  a: '#78b858',
  A: '#4c8438',
  n: '#2c5424',
  c: '#b08c60',
  C: '#7c6040',
});

export const WOMAN = palette({
  h: '#c84834',
  H: '#8c2c24',
  k: '#581818',
  a: '#d86ca0',
  A: '#a84478',
  n: '#6c2450',
  w: '#f8f8f0',
  W: '#c8c4d8',
});

export const CHILD = palette({
  h: '#f0a040',
  H: '#c06c20',
  k: '#7c4014',
  a: '#f8d850',
  A: '#c8a028',
  n: '#806018',
  c: '#5888d8',
  C: '#3858a0',
});

export const MERCHANT = palette({
  h: '#5c3c24',
  H: '#402818',
  k: '#28180c',
  a: '#e08838',
  A: '#b05c20',
  n: '#703414',
  c: '#40a070',
  C: '#246c48',
});

export const INNKEEPER = palette({
  h: '#6c4428',
  H: '#4c2c18',
  k: '#2c180c',
  a: '#6c8cc8',
  A: '#4a64a0',
  n: '#2c3c6c',
  r: '#e04848',
  R: '#a02c38',
});

export const GUARD = palette({
  h: '#8c5830',
  H: '#603818',
  k: '#3c2010',
  a: '#d04848',
  A: '#9c2c34',
  n: '#601c24',
});

export const CAT = palette({
  a: '#f0a860',
  A: '#c87838',
  n: '#8c4c24',
  w: '#fcf0dc',
  W: '#e0c8a8',
  e: '#305830',
  r: '#f08c9c',
});

/** The spirit is drawn opaque with these pale colours, then composited translucently. */
export const SPIRIT = palette({
  o: '#34509c',
  e: '#2c4890',
  h: '#c8e4ff',
  H: '#88b4ec',
  k: '#5880d0',
  a: '#f0fcff',
  A: '#b8e4f8',
  n: '#7cb4e4',
  s: '#fffaf2',
  S: '#e4e4f4',
});
