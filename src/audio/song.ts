// Song definitions (data) and compilation into timed events. No Web Audio here.

import { NotationError, parsePart, TICKS_PER_WHOLE, type ParsedPart } from './notation';
import type { InstrumentId } from './palette';

export interface ChannelDef {
  /** Short name, used in error messages and the jukebox. */
  name: string;
  /** Starting instrument; a part may switch with "@name". */
  instrument: InstrumentId;
  /** Played once before the body starts looping (e.g. a victory fanfare). */
  intro?: string;
  /** The main part. Loops for looping songs. */
  body: string;
  /** Channel gain (default 1). */
  volume?: number;
  /** Stereo position -1..1 (default 0). */
  pan?: number;
  /** Reverb send 0..1 (default 0.25). */
  reverb?: number;
  /** Echo send 0..1 (default 0). */
  echo?: number;
  /** Marks the lead and bass lines so tests can check harmony between them. */
  role?: 'melody' | 'bass';
}

export interface SongDef {
  title: string;
  /** Tempo in quarter notes per minute (also for 3/4 and 6/8). */
  bpm: number;
  /** Time signature [beats, beat unit]; default [4, 4]. */
  meter?: [number, number];
  /** Key, e.g. "D major" or "E minor" (natural minor). Used by tests to catch wrong notes. */
  key: string;
  /** Pitch classes allowed outside the key, e.g. "G# Bb". */
  chromatic?: string;
  /** Looping songs repeat the body forever; others (jingles) end after it. */
  loop: boolean;
  channels: ChannelDef[];
}

export interface CompiledChannel {
  def: ChannelDef;
  intro: ParsedPart | null;
  body: ParsedPart;
}

export interface CompiledSong {
  def: SongDef;
  /** Ticks per measure. */
  measure: number;
  introLength: number;
  bodyLength: number;
  secondsPerTick: number;
  channels: CompiledChannel[];
}

/** Parses every channel and checks that they line up; throws NotationError on any problem. */
export function compileSong(def: SongDef): CompiledSong {
  const [beats, unit] = def.meter ?? [4, 4];
  const measure = (beats * TICKS_PER_WHOLE) / unit;
  const channels = def.channels.map((ch): CompiledChannel => {
    const parse = (src: string, section: string): ParsedPart => {
      try {
        const part = parsePart(src, ch.instrument);
        for (const bar of part.barLines) {
          if (bar % measure !== 0) {
            throw new NotationError(`bar line at tick ${bar} is not on a measure boundary (bar ${bar / measure + 1})`);
          }
        }
        return part;
      } catch (e) {
        throw new NotationError(`${def.title} / ${ch.name} / ${section}: ${(e as Error).message}`);
      }
    };
    return { def: ch, intro: ch.intro ? parse(ch.intro, 'intro') : null, body: parse(ch.body, 'body') };
  });

  const sectionLength = (section: 'intro' | 'body'): number => {
    const lengths = new Set(channels.flatMap((c) => (c[section] ? [c[section].length] : [])));
    if (lengths.size > 1) {
      const detail = channels.map((c) => `${c.def.name}=${c[section]?.length ?? '-'}`).join(', ');
      throw new NotationError(`${def.title}: channel ${section} lengths differ (${detail})`);
    }
    const length = lengths.size ? [...lengths][0] : 0;
    if (length % measure !== 0) {
      throw new NotationError(`${def.title}: ${section} length ${length} is not a whole number of measures`);
    }
    return length;
  };
  const introLength = sectionLength('intro');
  const bodyLength = sectionLength('body');
  if (bodyLength === 0) throw new NotationError(`${def.title}: empty body`);

  return {
    def,
    measure,
    introLength,
    bodyLength,
    secondsPerTick: 60 / def.bpm / (TICKS_PER_WHOLE / 4),
    channels,
  };
}
