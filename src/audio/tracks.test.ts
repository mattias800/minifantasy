import { beforeAll, describe, expect, it } from 'vitest';
import { noteToMidi, parseDuration, parsePart, TICKS_PER_QUARTER, type ParsedPart } from './notation';
import type { InstrumentId } from './palette';
import { compileSong, type CompiledSong, type SongDef } from './song';
import { JINGLES, MUSIC } from './tracks';
import { bars } from './tracks/util';

describe('notation', () => {
  it('parses pitches', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(noteToMidi('F#5')).toBe(78);
  });

  it('parses durations', () => {
    expect(parseDuration('4')).toBe(48);
    expect(parseDuration('8.')).toBe(36);
    expect(parseDuration('8t')).toBe(16);
    expect(parseDuration('2~8')).toBe(120);
  });

  it('handles sticky durations, chords, ties, rests, repeats and velocity', () => {
    const part = parsePart('| C4:8 E4 ( G4 )x2 r:2 | v50 C4+E4+G4:2 _:4 r:4 |', 'harp');
    expect(part.length).toBe(TICKS_PER_QUARTER * 8);
    expect(part.barLines).toEqual([0, 192, 384]);
    expect(part.events.map((e) => e.tick)).toEqual([0, 24, 48, 72, 192]);
    const chord = part.events[4];
    expect(chord.pitches).toEqual([60, 64, 67]);
    expect(chord.dur).toBe(144);
    expect(chord.vel).toBe(0.5);
  });

  it('switches instruments and parses drums', () => {
    const part = parsePart('k+h:8 s @harp C4:4', 'drums');
    expect(part.events.map((e) => [e.instrument, e.drums, e.pitches])).toEqual([
      ['drums', ['k', 'h'], []],
      ['drums', ['s'], []],
      ['harp', [], [60]],
    ]);
  });

  it('rejects malformed input', () => {
    expect(() => parsePart('H4:4', 'harp')).toThrow();
    expect(() => parsePart('C4:3', 'harp')).toThrow();
    expect(() => parsePart('r:4 _:4', 'harp')).toThrow();
    expect(() => parsePart('( C4:4', 'harp')).toThrow();
    expect(() => parsePart('C4:4', 'drums')).toThrow();
    expect(() => parsePart('@kazoo', 'harp')).toThrow();
  });

  it('builds chord-driven parts', () => {
    expect(bars('C G', { C: 'C3:1', G: 'G2:1' })).toBe('| C3:1 | G2:1 |');
    expect(() => bars('X', {})).toThrow();
  });
});

// --- musical sanity checks on every track -------------------------------------------------

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/** Pitch classes allowed in a song: its key's scale plus any declared chromatic notes. */
function allowedPitchClasses(def: SongDef): Set<number> {
  const [tonic, mode] = def.key.split(' ');
  const root = noteToMidi(`${tonic}4`) % 12;
  const allowed = new Set(SCALES[mode].map((step) => (root + step) % 12));
  for (const name of (def.chromatic ?? '').split(/\s+/).filter(Boolean)) allowed.add(noteToMidi(`${name}4`) % 12);
  return allowed;
}

/** Comfortable MIDI range per instrument. */
const RANGES: Record<Exclude<InstrumentId, 'drums'>, [number, number]> = {
  harp: [36, 96],
  pluck: [40, 88],
  strings: [45, 96],
  flute: [60, 98],
  brass: [52, 92],
  lead: [55, 96],
  bass: [28, 60],
  organ: [43, 84],
  choir: [45, 84],
  bell: [72, 100],
  celesta: [60, 100],
  timpani: [36, 52],
};

/** The pitches sounding at `tick` (lowest first). */
function soundingAt(part: ParsedPart, tick: number): number[] {
  const e = part.events.find((ev) => ev.tick <= tick && tick < ev.tick + ev.dur);
  return e ? [...e.pitches].sort((a, b) => a - b) : [];
}

const ALL_SONGS: [string, SongDef][] = [...Object.entries(MUSIC), ...Object.entries(JINGLES)];

describe.each(ALL_SONGS)('%s', (id, def) => {
  // Compilation checks that channels have equal intro/body lengths (no drift when looping)
  // and that every bar line falls on a measure boundary; it throws otherwise.
  let song: CompiledSong;
  beforeAll(() => {
    song = compileSong(def);
  });

  const parts = (): ParsedPart[] => song.channels.flatMap((c) => (c.intro ? [c.intro, c.body] : [c.body]));

  it('uses only notes of its key (plus declared chromatic notes)', () => {
    const allowed = allowedPitchClasses(def);
    const wrong = parts().flatMap((p) => p.events.flatMap((e) => e.pitches.filter((m) => !allowed.has(m % 12))));
    expect(wrong).toEqual([]);
  });

  it('keeps every instrument in a sane range', () => {
    const outOfRange = parts().flatMap((p) =>
      p.events.flatMap((e) => {
        if (e.instrument === 'drums') return [];
        const [lo, hi] = RANGES[e.instrument];
        return e.pitches.filter((m) => m < lo || m > hi).map((m) => `${e.instrument}:${m}@${e.tick}`);
      }),
    );
    expect(outOfRange).toEqual([]);
  });

  it('has sensible velocities', () => {
    const bad = parts().flatMap((p) => p.events.filter((e) => e.vel <= 0 || e.vel > 1.2));
    expect(bad).toEqual([]);
  });

  it('never puts a minor ninth between melody and bass on a downbeat', () => {
    const melody = song.channels.find((c) => c.def.role === 'melody');
    const bass = song.channels.find((c) => c.def.role === 'bass');
    expect(melody && bass).toBeTruthy();
    const clashes: string[] = [];
    for (const section of ['intro', 'body'] as const) {
      const m = melody![section];
      const b = bass![section];
      if (!m || !b) continue;
      for (let tick = 0; tick < m.length; tick += song.measure) {
        const [top] = soundingAt(m, tick).slice(-1);
        const [low] = soundingAt(b, tick);
        if (top !== undefined && low !== undefined && (top - low) % 12 === 1) {
          clashes.push(`${section} bar ${tick / song.measure + 1}`);
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it('has a sensible duration', () => {
    const seconds = (song.introLength + song.bodyLength) * song.secondsPerTick;
    if (id in JINGLES) {
      expect(def.loop).toBe(false);
      expect(seconds).toBeGreaterThanOrEqual(1);
      expect(seconds).toBeLessThanOrEqual(4);
    } else {
      expect(def.loop).toBe(true);
      expect(song.bodyLength * song.secondsPerTick).toBeGreaterThanOrEqual(25);
      expect(seconds).toBeLessThanOrEqual(100);
    }
  });
});
