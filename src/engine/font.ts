/**
 * Minifantasy bitmap font — an original, hand-drawn SNES-JRPG style typeface.
 *
 * Metrics (all in game pixels):
 *   - cap height 7, x-height 5, descenders 2 (g j p q y , ; and friends)
 *   - proportional widths with 1px letter spacing; digits 0-9 share one advance so
 *     numbers line up in menus
 *   - line box: 1px top padding + 7 cap + 2 descender + 1 shadow + 1 gap = 12px
 *
 * Glyph metrics are plain data, so `measureText` / `wrapText` work without a DOM
 * (e.g. in vitest's node environment). Canvases are only created lazily on the
 * first draw: one white mask atlas holding every glyph, plus one colourised atlas
 * per (colour, shadow) pair with the drop shadow baked in, so each character costs
 * a single `drawImage` at runtime.
 */

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Rows of a glyph cell: 7 (cap height, rows 0-6, baseline under row 6) + 2 descender rows. */
export const GLYPH_ROWS = 9;
/** Rows above the baseline (the cap height). Glyphs may declare only these rows. */
const CAP_ROWS = 7;
/** Blank pixels between the top of the line box and the top of the capitals. */
const TOP_PADDING = 1;
/** Horizontal gap between consecutive glyphs. */
export const FONT_LETTER_SPACING = 1;

/** Recommended line spacing in px. */
export const FONT_LINE_HEIGHT = 12;
/** Px from the y passed to drawText (top of the line box) to the baseline. */
export const FONT_ASCENT = TOP_PADDING + CAP_ROWS;

export interface TextStyle {
  /** Fill colour of the glyphs. Default '#ffffff'. */
  color?: string;
  /** Drop-shadow colour, or null for no shadow. Default '#101030'. */
  shadow?: string | null;
}

const DEFAULT_COLOR = '#ffffff';
const DEFAULT_SHADOW = '#101030';

/**
 * Where the drop shadow is stamped relative to the glyph. Right + bottom + diagonal
 * gives the chunky FF-style outline that stays readable on bright window gradients.
 */
const SHADOW_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
];

// ---------------------------------------------------------------------------
// Glyph data
//
// Each glyph is a list of rows, '#' = ink, '.' = blank. Row 0 is the top of the
// capitals, row 6 sits on the baseline, rows 7-8 are descenders. Glyphs without
// descenders may list just the 7 cap rows. The width of a glyph is the length of
// its rows (all rows must have the same length — enforced by font.test.ts).
// ---------------------------------------------------------------------------

type GlyphRows = readonly string[];

const GLYPHS: Record<string, GlyphRows> = {
  // --- Space & punctuation -------------------------------------------------
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
  '#': [
    '.....',
    '.#.#.',
    '#####',
    '.#.#.',
    '#####',
    '.#.#.',
    '.....',
  ],
  '$': [
    '..#..',
    '.####',
    '#.#..',
    '.###.',
    '..#.#',
    '####.',
    '..#..',
  ],
  '%': [
    '##...',
    '##..#',
    '...#.',
    '..#..',
    '.#...',
    '#..##',
    '...##',
  ],
  '&': [
    '.##..',
    '#..#.',
    '#.#..',
    '.#...',
    '#.#.#',
    '#..#.',
    '.##.#',
  ],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
  '*': [
    '.....',
    '.#.#.',
    '..#..',
    '#####',
    '..#..',
    '.#.#.',
    '.....',
  ],
  '+': [
    '.....',
    '..#..',
    '..#..',
    '#####',
    '..#..',
    '..#..',
    '.....',
  ],
  ',': ['..', '..', '..', '..', '..', '..', '.#', '.#', '#.'],
  '-': ['....', '....', '....', '####', '....', '....', '....'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  '/': ['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..'],

  // --- Digits (all 5px wide so columns of numbers align) ---------------------
  '0': [
    '.###.',
    '#...#',
    '#..##',
    '#.#.#',
    '##..#',
    '#...#',
    '.###.',
  ],
  '1': [
    '..#..',
    '.##..',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
    '.###.',
  ],
  '2': [
    '.###.',
    '#...#',
    '....#',
    '...#.',
    '..#..',
    '.#...',
    '#####',
  ],
  '3': [
    '.###.',
    '#...#',
    '....#',
    '..##.',
    '....#',
    '#...#',
    '.###.',
  ],
  '4': [
    '...#.',
    '..##.',
    '.#.#.',
    '#..#.',
    '#####',
    '...#.',
    '...#.',
  ],
  '5': [
    '#####',
    '#....',
    '####.',
    '....#',
    '....#',
    '#...#',
    '.###.',
  ],
  '6': [
    '..##.',
    '.#...',
    '#....',
    '####.',
    '#...#',
    '#...#',
    '.###.',
  ],
  '7': [
    '#####',
    '....#',
    '...#.',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
  ],
  '8': [
    '.###.',
    '#...#',
    '#...#',
    '.###.',
    '#...#',
    '#...#',
    '.###.',
  ],
  '9': [
    '.###.',
    '#...#',
    '#...#',
    '.####',
    '....#',
    '...#.',
    '.##..',
  ],

  ':': ['.', '.', '#', '.', '.', '.', '#'],
  ';': ['..', '..', '.#', '..', '..', '..', '.#', '.#', '#.'],
  '<': ['...', '..#', '.#.', '#..', '.#.', '..#', '...'],
  '=': ['....', '....', '####', '....', '####', '....', '....'],
  '>': ['...', '#..', '.#.', '..#', '.#.', '#..', '...'],
  '?': [
    '.###.',
    '#...#',
    '....#',
    '...#.',
    '..#..',
    '.....',
    '..#..',
  ],
  '@': [
    '.###.',
    '#...#',
    '#.###',
    '#.#.#',
    '#.###',
    '#....',
    '.###.',
  ],

  // --- Uppercase -----------------------------------------------------------
  A: [
    '.###.',
    '#...#',
    '#...#',
    '#####',
    '#...#',
    '#...#',
    '#...#',
  ],
  B: [
    '####.',
    '#...#',
    '#...#',
    '####.',
    '#...#',
    '#...#',
    '####.',
  ],
  C: [
    '.###.',
    '#...#',
    '#....',
    '#....',
    '#....',
    '#...#',
    '.###.',
  ],
  D: [
    '####.',
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '####.',
  ],
  E: ['####', '#...', '#...', '###.', '#...', '#...', '####'],
  F: ['####', '#...', '#...', '###.', '#...', '#...', '#...'],
  G: [
    '.###.',
    '#...#',
    '#....',
    '#.###',
    '#...#',
    '#...#',
    '.###.',
  ],
  H: [
    '#...#',
    '#...#',
    '#...#',
    '#####',
    '#...#',
    '#...#',
    '#...#',
  ],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['...#', '...#', '...#', '...#', '...#', '#..#', '.##.'],
  K: [
    '#...#',
    '#..#.',
    '#.#..',
    '##...',
    '#.#..',
    '#..#.',
    '#...#',
  ],
  L: ['#...', '#...', '#...', '#...', '#...', '#...', '####'],
  M: [
    '#...#',
    '##.##',
    '#.#.#',
    '#.#.#',
    '#...#',
    '#...#',
    '#...#',
  ],
  N: [
    '#...#',
    '#...#',
    '##..#',
    '#.#.#',
    '#..##',
    '#...#',
    '#...#',
  ],
  O: [
    '.###.',
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '.###.',
  ],
  P: [
    '####.',
    '#...#',
    '#...#',
    '####.',
    '#....',
    '#....',
    '#....',
  ],
  Q: [
    '.###.',
    '#...#',
    '#...#',
    '#...#',
    '#.#.#',
    '#..#.',
    '.##.#',
  ],
  R: [
    '####.',
    '#...#',
    '#...#',
    '####.',
    '#.#..',
    '#..#.',
    '#...#',
  ],
  S: [
    '.###.',
    '#...#',
    '#....',
    '.###.',
    '....#',
    '#...#',
    '.###.',
  ],
  T: [
    '#####',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
  ],
  U: [
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '.###.',
  ],
  V: [
    '#...#',
    '#...#',
    '#...#',
    '#...#',
    '.#.#.',
    '.#.#.',
    '..#..',
  ],
  W: [
    '#...#',
    '#...#',
    '#...#',
    '#.#.#',
    '#.#.#',
    '#.#.#',
    '.#.#.',
  ],
  X: [
    '#...#',
    '#...#',
    '.#.#.',
    '..#..',
    '.#.#.',
    '#...#',
    '#...#',
  ],
  Y: [
    '#...#',
    '#...#',
    '.#.#.',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
  ],
  Z: [
    '#####',
    '....#',
    '...#.',
    '..#..',
    '.#...',
    '#....',
    '#####',
  ],

  '[': ['##', '#.', '#.', '#.', '#.', '#.', '##'],
  '\\': ['#..', '#..', '.#.', '.#.', '.#.', '..#', '..#'],
  ']': ['##', '.#', '.#', '.#', '.#', '.#', '##'],
  '^': ['.#.', '#.#', '...', '...', '...', '...', '...'],
  '_': ['....', '....', '....', '....', '....', '....', '....', '....', '####'],
  '`': ['#.', '.#', '..', '..', '..', '..', '..'],

  // --- Lowercase (x-height rows 2-6) ------------------------------------------
  a: ['....', '....', '.##.', '...#', '.###', '#..#', '.###'],
  b: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.'],
  c: ['....', '....', '.###', '#...', '#...', '#...', '.###'],
  d: ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'],
  e: ['....', '....', '.##.', '#..#', '####', '#...', '.###'],
  f: ['.##', '#..', '###', '#..', '#..', '#..', '#..'],
  g: ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '###.'],
  h: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#'],
  i: ['#', '.', '#', '#', '#', '#', '#'],
  j: ['.#', '..', '.#', '.#', '.#', '.#', '.#', '.#', '#.'],
  k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
  l: ['#.', '#.', '#.', '#.', '#.', '#.', '.#'],
  m: [
    '.....',
    '.....',
    '##.#.',
    '#.#.#',
    '#.#.#',
    '#.#.#',
    '#.#.#',
  ],
  n: ['....', '....', '###.', '#..#', '#..#', '#..#', '#..#'],
  o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.'],
  p: ['....', '....', '###.', '#..#', '#..#', '#..#', '###.', '#...', '#...'],
  q: ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '...#'],
  r: ['....', '....', '#.##', '##..', '#...', '#...', '#...'],
  s: ['....', '....', '.###', '#...', '.##.', '...#', '###.'],
  t: ['...', '#..', '###', '#..', '#..', '#..', '.##'],
  u: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###'],
  v: [
    '.....',
    '.....',
    '#...#',
    '#...#',
    '.#.#.',
    '.#.#.',
    '..#..',
  ],
  w: [
    '.....',
    '.....',
    '#...#',
    '#...#',
    '#.#.#',
    '#.#.#',
    '.#.#.',
  ],
  x: [
    '.....',
    '.....',
    '#...#',
    '.#.#.',
    '..#..',
    '.#.#.',
    '#...#',
  ],
  y: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###', '...#', '###.'],
  z: ['....', '....', '####', '..#.', '.#..', '#...', '####'],

  '{': ['..#', '.#.', '.#.', '#..', '.#.', '.#.', '..#'],
  '|': ['#', '#', '#', '#', '#', '#', '#', '#', '#'],
  '}': ['#..', '.#.', '.#.', '..#', '.#.', '.#.', '#..'],
  '~': ['.....', '.....', '.#...', '#.#.#', '...#.', '.....', '.....'],

  // --- Extras -------------------------------------------------------------
  /** Ellipsis (U+2026). */
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],
  /** Heart (U+2665). */
  '♥': [
    '.......',
    '.##.##.',
    '#######',
    '#######',
    '.#####.',
    '..###..',
    '...#...',
  ],
  /** Star (U+2605). */
  '★': [
    '...#...',
    '..###..',
    '#######',
    '.#####.',
    '..###..',
    '.##.##.',
    '.#...#.',
  ],
  /** Small right-pointing arrow (U+25BA), for cursors and bullets. */
  '►': ['...', '#..', '##.', '###', '##.', '#..', '...'],
  /** Small left-pointing arrow (U+25C4), for quantity pickers. */
  '◄': ['...', '..#', '.##', '###', '.##', '..#', '...'],
  /** Small up arrow (U+25B2), the "scroll up" indicator. */
  '▲': ['.....', '..#..', '.###.', '#####', '.....', '.....', '.....'],
  /** Small down arrow (U+25BC), the "more text" prompt. */
  '▼': ['.....', '.....', '.....', '#####', '.###.', '..#..', '.....'],
  /** Figure space (U+2007): blank but as wide as a digit, for padding numbers in columns. */
  '\u2007': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  /** Em dash (U+2014). */
  '—': ['.......', '.......', '.......', '#######', '.......', '.......', '.......'],
};

/** Alternative code points that reuse an existing glyph. */
const ALIASES: Record<string, string> = {
  '\t': ' ',
  '\u00A0': ' ', // no-break space
  '\u25B6': '►', // black right-pointing triangle
  '\u2764': '♥', // heavy black heart
  '\u2013': '-', // en dash
  '\u2018': "'", // curly single quotes
  '\u2019': "'",
  '\u201C': '"', // curly double quotes
  '\u201D': '"',
};

/** Rendered for any character without a glyph. */
const UNKNOWN_GLYPH: GlyphRows = ['....', '....', '####', '#..#', '#..#', '#..#', '####'];

// ---------------------------------------------------------------------------
// Glyph table (pure data, built at import time — no DOM)
// ---------------------------------------------------------------------------

interface Glyph {
  /** Ink width in px (advance = width + FONT_LETTER_SPACING). */
  readonly width: number;
  /** GLYPH_ROWS rows, padded with blank descender rows when omitted. */
  readonly rows: readonly string[];
  /** X of this glyph's cell in the atlases (filled when the atlas is built). */
  atlasX: number;
  /** True if the glyph has no ink at all (spaces), so drawing can be skipped. */
  readonly blank: boolean;
}

function makeGlyph(rows: GlyphRows): Glyph {
  const width = rows[0].length;
  const padded = rows.slice();
  while (padded.length < GLYPH_ROWS) padded.push('.'.repeat(width));
  return { width, rows: padded, atlasX: 0, blank: !padded.some((r) => r.includes('#')) };
}

const GLYPH_TABLE = new Map<string, Glyph>();
for (const [ch, rows] of Object.entries(GLYPHS)) GLYPH_TABLE.set(ch, makeGlyph(rows));
for (const [ch, target] of Object.entries(ALIASES)) GLYPH_TABLE.set(ch, GLYPH_TABLE.get(target)!);
const UNKNOWN = makeGlyph(UNKNOWN_GLYPH);

function glyphFor(ch: string): Glyph {
  return GLYPH_TABLE.get(ch) ?? UNKNOWN;
}

/** Raw glyph rows for a character (undefined if the font has no glyph). Exposed for tests/tools. */
export function glyphRows(ch: string): GlyphRows | undefined {
  return GLYPHS[ch];
}

/** Every character that has its own hand-drawn glyph. */
export const FONT_CHARACTERS: readonly string[] = Object.keys(GLYPHS);

// ---------------------------------------------------------------------------
// Measuring & wrapping (DOM-free)
// ---------------------------------------------------------------------------

/**
 * Width in px of `text` from the first glyph's left edge to the last glyph's right
 * edge (the trailing letter spacing is not included). To continue a run with
 * another drawText call, add FONT_LETTER_SPACING.
 */
export function measureText(text: string): number {
  let w = 0;
  let count = 0;
  for (const ch of text) {
    w += glyphFor(ch).width;
    count++;
  }
  return count === 0 ? 0 : w + (count - 1) * FONT_LETTER_SPACING;
}

/**
 * Word-wraps text (respecting explicit '\n') into lines no wider than maxWidth.
 * Runs of spaces between words collapse to one; a single word wider than maxWidth
 * is broken between characters. Empty paragraphs are kept as empty lines.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ').filter((w) => w.length > 0);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureText(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // Hard-break words that cannot fit on a line of their own.
      let rest = word;
      while (measureText(rest) > maxWidth) {
        let cut = 1;
        const chars = Array.from(rest);
        while (cut < chars.length && measureText(chars.slice(0, cut + 1).join('')) <= maxWidth) cut++;
        lines.push(chars.slice(0, cut).join(''));
        rest = chars.slice(cut).join('');
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Atlases (lazy, DOM required)
// ---------------------------------------------------------------------------

/** Each atlas cell is one px larger than the glyph on the right and bottom to fit the shadow. */
const CELL_HEIGHT = GLYPH_ROWS + 1;

let maskAtlas: HTMLCanvasElement | null = null;
const styledAtlases = new Map<string, HTMLCanvasElement>();

function newCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('font: 2D canvas not supported');
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

/** Draws every glyph as a white mask into one horizontal strip. */
function getMaskAtlas(): HTMLCanvasElement {
  if (maskAtlas) return maskAtlas;
  const glyphs = [...new Set([...GLYPH_TABLE.values(), UNKNOWN])];
  let x = 0;
  for (const g of glyphs) {
    g.atlasX = x;
    x += g.width + 1;
  }
  const [canvas, ctx] = newCanvas(Math.max(1, x), CELL_HEIGHT);
  ctx.fillStyle = '#ffffff';
  for (const g of glyphs) {
    g.rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(g.atlasX + i, y, 1, 1);
    });
  }
  maskAtlas = canvas;
  return canvas;
}

/** Returns a copy of the mask atlas filled with a solid colour. */
function tintedMask(color: string): HTMLCanvasElement {
  const mask = getMaskAtlas();
  const [canvas, ctx] = newCanvas(mask.width, mask.height);
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Atlas with glyphs in `color` and the drop shadow (if any) baked in. Cached per style. */
function getStyledAtlas(color: string, shadow: string | null): HTMLCanvasElement {
  const key = `${color}|${shadow ?? ''}`;
  let atlas = styledAtlases.get(key);
  if (atlas) return atlas;
  const mask = getMaskAtlas();
  const [canvas, ctx] = newCanvas(mask.width, mask.height);
  if (shadow) {
    const shadowLayer = tintedMask(shadow);
    for (const [dx, dy] of SHADOW_OFFSETS) ctx.drawImage(shadowLayer, dx, dy);
  }
  ctx.drawImage(tintedMask(color), 0, 0);
  atlas = canvas;
  styledAtlases.set(key, atlas);
  return atlas;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Draws single-line text; (x, y) is the top-left of the line box. Returns the advance width drawn. '\n' is not handled here. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style?: TextStyle,
): number {
  const color = style?.color ?? DEFAULT_COLOR;
  const shadow = style?.shadow === undefined ? DEFAULT_SHADOW : style.shadow;
  const atlas = getStyledAtlas(color, shadow);
  const top = Math.round(y) + TOP_PADDING;
  const startX = Math.round(x);
  let penX = startX;
  let count = 0;
  for (const ch of text) {
    const g = glyphFor(ch);
    if (!g.blank) {
      ctx.drawImage(atlas, g.atlasX, 0, g.width + 1, CELL_HEIGHT, penX, top, g.width + 1, CELL_HEIGHT);
    }
    penX += g.width + FONT_LETTER_SPACING;
    count++;
  }
  return count === 0 ? 0 : penX - startX - FONT_LETTER_SPACING;
}

/** Draws text so that its right edge (excluding shadow) sits at rightX. Returns the width drawn. */
export function drawTextRight(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightX: number,
  y: number,
  style?: TextStyle,
): number {
  return drawText(ctx, text, Math.round(rightX) - measureText(text), y, style);
}

/** Draws text horizontally centred on centerX. Returns the width drawn. */
export function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  style?: TextStyle,
): number {
  return drawText(ctx, text, Math.round(centerX) - Math.floor(measureText(text) / 2), y, style);
}
