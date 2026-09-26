// Plays a compiled song on a Synth. Scheduling is pull-based: the owner calls
// scheduleUntil(time) regularly (a lookahead timer in real time, or once for offline rendering),
// and every note up to that time is scheduled sample-accurately on the AudioContext clock.

import { DRUMS, INSTRUMENTS } from './instruments';
import { gain } from './nodes';
import type { NoteEvent } from './notation';
import type { CompiledSong } from './song';
import type { Synth } from './synth';

interface Cue {
  tick: number;
  channel: number;
  event: NoteEvent;
}

/** Fraction of a note's written length that the key is held. */
const LEGATO = 0.94;
/** Notes that are already this late (s) are skipped rather than played in a burst. */
const MAX_LATENESS = 0.03;

export interface PlayerOptions {
  /** Context time at which `startTick` sounds. */
  startTime: number;
  /** Song position to start from (intro ticks first, then body ticks). Default 0. */
  startTick?: number;
  /** Fade-in duration in seconds. Default 0. */
  fadeIn?: number;
}

export class SongPlayer {
  /** Context time when a non-looping song has finished (Infinity for looping songs). */
  readonly endTime: number;
  private readonly synth: Synth;
  private readonly song: CompiledSong;
  private readonly introCues: Cue[];
  private readonly bodyCues: Cue[];
  private readonly inputs: GainNode[];
  /** Per-player dry / reverb / echo faders, so the whole song can fade as one. */
  private readonly faders: GainNode[];
  private readonly startTime: number;
  private readonly startTick: number;
  private inIntro: boolean;
  private index: number;
  /** Context time of tick 0 of the current section (intro or current body pass). */
  private sectionStart: number;
  private stopped = false;

  constructor(synth: Synth, song: CompiledSong, opts: PlayerOptions) {
    this.synth = synth;
    this.song = song;
    this.startTime = opts.startTime;
    this.startTick = opts.startTick ?? 0;
    this.introCues = mergeCues(song.channels.map((c) => c.intro?.events ?? []));
    this.bodyCues = mergeCues(song.channels.map((c) => c.body.events));

    const { ctx } = synth;
    const bus = synth.music;
    this.faders = [bus.dry, bus.reverb, bus.echo].map((dest) => {
      const fader = ctx.createGain();
      fader.connect(dest);
      if (opts.fadeIn) {
        fader.gain.setValueAtTime(0, opts.startTime);
        fader.gain.linearRampToValueAtTime(1, opts.startTime + opts.fadeIn);
      }
      return fader;
    });
    const [dry, reverb, echo] = this.faders;
    this.inputs = song.channels.map(({ def }) => {
      const input = ctx.createGain();
      input.gain.value = def.volume ?? 1;
      const pan = ctx.createStereoPanner();
      pan.pan.value = def.pan ?? 0;
      input.connect(pan).connect(dry);
      pan.connect(gain(ctx, def.reverb ?? 0.25, reverb));
      pan.connect(gain(ctx, def.echo ?? 0, echo));
      return input;
    });

    // Seek to the start position.
    const spt = song.secondsPerTick;
    let sectionTick: number;
    if (this.startTick < song.introLength) {
      this.inIntro = true;
      sectionTick = this.startTick;
    } else {
      this.inIntro = false;
      sectionTick = (this.startTick - song.introLength) % song.bodyLength;
    }
    this.sectionStart = opts.startTime - sectionTick * spt;
    this.index = (this.inIntro ? this.introCues : this.bodyCues).findIndex((c) => c.tick >= sectionTick);
    if (this.index < 0) this.index = Number.MAX_SAFE_INTEGER; // nothing left in this section
    const remaining = song.introLength + song.bodyLength - this.startTick;
    this.endTime = song.def.loop ? Infinity : opts.startTime + Math.max(0, remaining) * spt;
  }

  /** Schedules every note that starts before `until` (context time). */
  scheduleUntil(until: number): void {
    const { secondsPerTick: spt, introLength, bodyLength } = this.song;
    const now = this.synth.ctx.currentTime;
    while (!this.stopped) {
      const cues = this.inIntro ? this.introCues : this.bodyCues;
      if (this.index >= cues.length) {
        // Advance to the next section: intro -> body, body -> body again (if looping).
        const sectionLength = this.inIntro ? introLength : bodyLength;
        const next = this.sectionStart + sectionLength * spt;
        if (next >= until) return;
        if (!this.inIntro && !this.song.def.loop) return;
        this.inIntro = false;
        this.sectionStart = next;
        this.index = 0;
        if (this.bodyCues.length === 0) return;
        continue;
      }
      const cue = cues[this.index];
      const time = this.sectionStart + cue.tick * spt;
      if (time >= until) return;
      if (time >= now - MAX_LATENESS) this.play(cue, Math.max(time, now));
      this.index++;
    }
  }

  /** Song position (in ticks, intro first) that sounds at context time `time`. */
  positionAt(time: number): number {
    const { secondsPerTick: spt, introLength, bodyLength } = this.song;
    const tick = this.startTick + Math.max(0, time - this.startTime) / spt;
    if (tick < introLength) return tick;
    return introLength + ((tick - introLength) % bodyLength);
  }

  /** Fades the song out and stops scheduling. Call dispose() once the fade has finished. */
  stop(fadeSeconds: number): void {
    this.stopped = true;
    const now = this.synth.ctx.currentTime;
    for (const fader of this.faders) {
      fader.gain.cancelScheduledValues(now);
      fader.gain.setValueAtTime(fader.gain.value, now);
      fader.gain.linearRampToValueAtTime(0, now + Math.max(0.01, fadeSeconds));
    }
  }

  /** Disconnects the player's graph (silencing any notes still scheduled). */
  dispose(): void {
    this.stopped = true;
    for (const fader of this.faders) fader.disconnect();
  }

  private play(cue: Cue, time: number): void {
    const { event } = cue;
    const out = this.inputs[cue.channel];
    const gate = event.dur * this.song.secondsPerTick * LEGATO;
    if (event.instrument === 'drums') {
      for (const drum of event.drums) DRUMS[drum](this.synth, out, time, event.vel);
    } else {
      const instrument = INSTRUMENTS[event.instrument];
      for (const midi of event.pitches) instrument(this.synth, out, midi, time, gate, event.vel);
    }
  }
}

/** Merges the channels' event lists into one list sorted by start tick. */
function mergeCues(channels: NoteEvent[][]): Cue[] {
  const cues = channels.flatMap((events, channel) => events.map((event) => ({ tick: event.tick, channel, event })));
  return cues.sort((a, b) => a.tick - b.tick || a.channel - b.channel);
}
