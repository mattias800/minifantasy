import { describe, expect, it } from 'vitest';
import {
  FONT_ASCENT,
  FONT_CHARACTERS,
  FONT_LETTER_SPACING,
  FONT_LINE_HEIGHT,
  GLYPH_ROWS,
  glyphRows,
  measureText,
  wrapText,
} from './font';

const DIGITS = '0123456789'.split('');

describe('glyph data', () => {
  it('covers all printable ASCII', () => {
    for (let c = 32; c <= 126; c++) {
      expect(glyphRows(String.fromCharCode(c)), `missing glyph for code ${c}`).toBeDefined();
    }
  });

  it('covers the extra glyphs', () => {
    for (const code of [0x2026, 0x2665, 0x2605, 0x25ba, 0x25bc, 0x2014]) {
      expect(glyphRows(String.fromCharCode(code)), `missing glyph U+${code.toString(16)}`).toBeDefined();
    }
  });

  it('every glyph row matches the glyph width and uses only "#" and "."', () => {
    for (const ch of FONT_CHARACTERS) {
      const rows = glyphRows(ch)!;
      const width = rows[0].length;
      expect(width, `glyph "${ch}" width`).toBeGreaterThan(0);
      expect([7, GLYPH_ROWS], `glyph "${ch}" row count`).toContain(rows.length);
      rows.forEach((row, y) => {
        expect(row.length, `glyph "${ch}" row ${y} "${row}"`).toBe(width);
        expect(row, `glyph "${ch}" row ${y}`).toMatch(/^[#.]+$/);
      });
    }
  });

  it('non-digit glyphs have no empty edge columns (spacing comes from FONT_LETTER_SPACING)', () => {
    for (const ch of FONT_CHARACTERS) {
      const rows = glyphRows(ch)!;
      if (!rows.some((r) => r.includes('#'))) continue; // spaces
      if (DIGITS.includes(ch)) continue; // digits are tabular: padded to a shared width
      const width = rows[0].length;
      const columnHasInk = (x: number) => rows.some((r) => r[x] === '#');
      expect(columnHasInk(0), `glyph "${ch}" empty first column`).toBe(true);
      expect(columnHasInk(width - 1), `glyph "${ch}" empty last column`).toBe(true);
    }
  });
});

describe('metrics', () => {
  it('exposes sensible line metrics', () => {
    expect(FONT_LINE_HEIGHT).toBeGreaterThanOrEqual(11);
    expect(FONT_LINE_HEIGHT).toBeLessThanOrEqual(12);
    expect(FONT_ASCENT).toBe(8);
  });
});

describe('measureText', () => {
  it('returns 0 for the empty string', () => {
    expect(measureText('')).toBe(0);
  });

  it('gives every digit the same width', () => {
    const w = measureText('0');
    for (const d of DIGITS) expect(measureText(d), `digit ${d}`).toBe(w);
    expect(measureText('128')).toBe(measureText('888'));
    expect(measureText('1111')).toBe(measureText('9999'));
  });

  it('is proportional', () => {
    expect(measureText('i')).toBeLessThan(measureText('m'));
    expect(measureText('iiii')).toBeLessThan(measureText('mmmm'));
  });

  it('adds one letter spacing between glyphs but not after the last', () => {
    expect(measureText('AB')).toBe(measureText('A') + FONT_LETTER_SPACING + measureText('B'));
    expect(measureText('A')).toBe(5);
  });

  it('measures unknown characters as a box instead of throwing', () => {
    expect(measureText(String.fromCharCode(0x4e00))).toBeGreaterThan(0);
  });
});

describe('wrapText', () => {
  it('keeps short text on one line', () => {
    expect(wrapText('Hello there', 200)).toEqual(['Hello there']);
  });

  it('breaks between words and never exceeds maxWidth', () => {
    const text = 'The Heartstone grows dim. Will you journey to the Hollow Grotto?';
    const max = 80;
    const lines = wrapText(text, max);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measureText(line)).toBeLessThanOrEqual(max);
    expect(lines.join(' ')).toBe(text);
  });

  it('fills lines greedily', () => {
    const max = measureText('aa aa');
    expect(wrapText('aa aa aa aa aa', max)).toEqual(['aa aa', 'aa aa', 'aa']);
  });

  it('respects explicit newlines and keeps empty lines', () => {
    expect(wrapText('One\n\nTwo three', 500)).toEqual(['One', '', 'Two three']);
  });

  it('collapses runs of spaces', () => {
    expect(wrapText('a   b', 500)).toEqual(['a b']);
  });

  it('hard-breaks words longer than maxWidth', () => {
    const max = measureText('MMM');
    const lines = wrapText('MMMMMMMM ok', max);
    expect(lines).toEqual(['MMM', 'MMM', 'MM', 'ok']);
    for (const line of lines) expect(measureText(line)).toBeLessThanOrEqual(max);
  });

  it('returns a single empty line for empty input', () => {
    expect(wrapText('', 100)).toEqual(['']);
  });
});
