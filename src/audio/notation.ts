// A tiny text notation for song parts, parsed into timed note events.
//
// A part is a whitespace-separated list of tokens:
//
//   C5:8        note C in octave 5 (C4 = middle C) lasting an eighth. Accidentals: C#5, Bb3.
//   E5          no duration given: reuses the previous duration ("sticky", like MML).
//   A3+C4+E4:1  chord: several pitches starting together.
//   r:4         rest.
//   _:8         tie: extends the previous note/chord by an eighth (e.g. across a bar line).
//   k+h:8       drum hits (only in 'drums' parts); see DRUM_IDS.
//   |           bar line. Purely visual, but validated: it must fall on a measure boundary.
//   v70         velocity for following notes, in percent (default 100).
//   @strings    switch instrument for following notes.
//   ( ... )x4   repeat the enclosed tokens 4 times (groups may nest).
//
// Durations: 1 2 4 8 16 32 (whole .. 32nd), suffix "." = dotted, "t" = triplet,
// and "~" adds durations together (":2~8" = half + eighth).

import { isDrumId, isInstrumentId, type DrumId, type InstrumentId } from './palette';

/** Ticks per whole note. 192 = 2^6 * 3, so 32nds (6) and 16th triplets (8) are whole numbers. */
export const TICKS_PER_WHOLE = 192;
export const TICKS_PER_QUARTER = TICKS_PER_WHOLE / 4;

export interface NoteEvent {
  /** Start, in ticks from the start of the part. */
  tick: number;
  /** Length in ticks (including ties). */
  dur: number;
  /** Velocity, 1 = default. */
  vel: number;
  instrument: InstrumentId;
  /** MIDI note numbers (empty for drum hits). */
  pitches: number[];
  /** Drum hits (empty for pitched notes). */
  drums: DrumId[];
}

export interface ParsedPart {
  events: NoteEvent[];
  /** Total length in ticks, including trailing rests. */
  length: number;
  /** Tick positions of every "|" bar line. */
  barLines: number[];
}

export class NotationError extends Error {
  override name = 'NotationError';
}

const PITCH_RE = /^([A-G])([#b]?)(-?\d)$/;
const DURATION_RE = /^(1|2|4|8|16|32)([.t]?)$/;
const REPEAT_END_RE = /^\)x(\d+)$/;
const VELOCITY_RE = /^v(\d+)$/;
const NATURAL_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" -> 60, "A4" -> 69, "Bb2" -> 46. */
export function noteToMidi(name: string): number {
  const m = PITCH_RE.exec(name);
  if (!m) throw new NotationError(`invalid pitch "${name}"`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + NATURAL_SEMITONES[m[1]] + accidental;
}

/** "4" -> 48, "8." -> 36, "8t" -> 16, "2~8" -> 120. */
export function parseDuration(spec: string): number {
  let total = 0;
  for (const part of spec.split('~')) {
    const m = DURATION_RE.exec(part);
    if (!m) throw new NotationError(`invalid duration "${spec}"`);
    let ticks = TICKS_PER_WHOLE / Number(m[1]);
    if (m[2] === '.') ticks *= 1.5;
    else if (m[2] === 't') ticks = (ticks * 2) / 3;
    total += ticks;
  }
  return total;
}

/** Expands "( ... )xN" groups into a flat token list. */
function expandRepeats(tokens: string[]): string[] {
  const stack: string[][] = [[]];
  for (const tok of tokens) {
    const end = REPEAT_END_RE.exec(tok);
    if (tok === '(') {
      stack.push([]);
    } else if (end) {
      const group = stack.pop();
      if (!group || stack.length === 0) throw new NotationError(`"${tok}" without matching "("`);
      const target = stack[stack.length - 1];
      for (let i = 0; i < Number(end[1]); i++) target.push(...group);
    } else {
      stack[stack.length - 1].push(tok);
    }
  }
  if (stack.length !== 1) throw new NotationError('unclosed "(" repeat group');
  return stack[0];
}

/** Parses one part. `instrument` is the part's starting instrument (changed with "@name"). */
export function parsePart(source: string, instrument: InstrumentId): ParsedPart {
  const tokens = expandRepeats(source.split(/\s+/).filter((t) => t.length > 0));
  const events: NoteEvent[] = [];
  const barLines: number[] = [];
  let tick = 0;
  let dur = TICKS_PER_QUARTER;
  let vel = 1;
  let current = instrument;

  for (const tok of tokens) {
    const fail = (msg: string): never => {
      throw new NotationError(`${msg} (token "${tok}" at tick ${tick})`);
    };
    if (tok === '|') {
      barLines.push(tick);
      continue;
    }
    const velocity = VELOCITY_RE.exec(tok);
    if (velocity) {
      vel = Number(velocity[1]) / 100;
      continue;
    }
    if (tok.startsWith('@')) {
      const name = tok.slice(1);
      if (!isInstrumentId(name)) fail('unknown instrument');
      current = name as InstrumentId;
      continue;
    }

    const colon = tok.indexOf(':');
    const head = colon < 0 ? tok : tok.slice(0, colon);
    if (colon >= 0) {
      try {
        dur = parseDuration(tok.slice(colon + 1));
      } catch (e) {
        fail((e as Error).message);
      }
    }

    if (head === 'r') {
      tick += dur;
      continue;
    }
    if (head === '_') {
      const last = events[events.length - 1];
      if (!last || last.tick + last.dur !== tick) fail('tie must directly follow a note');
      last.dur += dur;
      tick += dur;
      continue;
    }

    const pitches: number[] = [];
    const drums: DrumId[] = [];
    for (const name of head.split('+')) {
      if (current === 'drums') {
        if (!isDrumId(name)) fail(`unknown drum "${name}"`);
        drums.push(name as DrumId);
      } else {
        try {
          pitches.push(noteToMidi(name));
        } catch (e) {
          fail((e as Error).message);
        }
      }
    }
    events.push({ tick, dur, vel, instrument: current, pitches, drums });
    tick += dur;
  }
  return { events, length: tick, barLines };
}
