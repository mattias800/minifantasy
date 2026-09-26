// The instrument palette: each instrument builds a small throwaway node graph per note.
// Peak levels are balanced so that a velocity-1 note of any instrument sits at a similar loudness.

import { applyEnvelope, filter, gain, midiToFreq, noise, osc, vibrato, type Envelope } from './nodes';
import type { DrumId, InstrumentId } from './palette';
import type { Synth } from './synth';

/** Plays one note: `gate` is how long the key is held (s); the release may ring past it. */
export type NoteFn = (s: Synth, out: AudioNode, midi: number, t: number, gate: number, vel: number) => void;
export type DrumFn = (s: Synth, out: AudioNode, t: number, vel: number) => void;

/** Envelope-controlled output gain for a voice; returns the node and the voice's end time. */
function voiceAmp(
  s: Synth,
  out: AudioNode,
  t: number,
  gate: number,
  peak: number,
  env: Envelope,
): [GainNode, number] {
  const amp = s.ctx.createGain();
  amp.connect(out);
  return [amp, applyEnvelope(amp.gain, t, t + gate, peak, env)];
}

/** Two-operator FM: a sine carrier whose frequency is modulated by a sine with a decaying index. */
function fm(s: Synth, dest: AudioNode, f: number, ratio: number, index: number, indexDecay: number, t: number, end: number): void {
  const carrier = osc(s.ctx, 'sine', f, t, end, dest);
  const depth = s.ctx.createGain();
  depth.gain.setValueAtTime(f * index, t);
  depth.gain.setTargetAtTime(0, t, indexDecay);
  osc(s.ctx, 'sine', f * ratio, t, end, depth);
  depth.connect(carrier.frequency);
}

const harp: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.32 * vel, { a: 0.004, d: 1.8, s: 0, r: 0.9 });
  const tone = filter(s.ctx, 'lowpass', Math.min(f * 10, 10000), 0.6, amp);
  tone.frequency.setTargetAtTime(Math.min(f * 3, 6000), t, 0.12);
  osc(s.ctx, 'triangle', f, t, end, tone);
  osc(s.ctx, 'sine', f * 2, t, end, gain(s.ctx, 0.3, tone));
};

const pluck: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.2 * vel, { a: 0.002, d: 0.8, s: 0, r: 0.15 });
  const tone = filter(s.ctx, 'lowpass', Math.min(f * 8, 10000), 2, amp);
  tone.frequency.setTargetAtTime(Math.max(f * 1.5, 300), t, 0.07);
  osc(s.ctx, 'sawtooth', f, t, end, tone);
};

const strings: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.075 * vel, { a: 0.3, d: 0.4, s: 0.85, r: 0.5 });
  const tone = filter(s.ctx, 'lowpass', Math.min(1600 + f * 1.5, 5000), 0.5, amp);
  const voices = [-9, 0, 9].map((cents) => osc(s.ctx, 'sawtooth', f, t, end, tone, cents + Math.random() * 4 - 2));
  vibrato(s.ctx, voices, t, end, 5.3, 7, 0.3);
};

const flute: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.26 * vel, { a: 0.06, d: 0.3, s: 0.8, r: 0.14 });
  const tone = filter(s.ctx, 'lowpass', Math.min(f * 4, 8000), 0.7, amp);
  const voices = [osc(s.ctx, 'sine', f, t, end, tone), osc(s.ctx, 'triangle', f, t, end, gain(s.ctx, 0.25, tone))];
  vibrato(s.ctx, voices, t, end, 5, 13, 0.22);
  // Breath "chiff" at the start of the note.
  const chiff = s.ctx.createGain();
  applyEnvelope(chiff.gain, t, t, 0.05 * vel, { a: 0.005, d: 0.07, s: 0, r: 0.02 });
  noise(s.ctx, s.noise, t, t + 0.1, filter(s.ctx, 'bandpass', Math.min(f * 2, 9000), 1.5, chiff));
  chiff.connect(out);
};

const brass: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.19 * vel, { a: 0.03, d: 0.25, s: 0.75, r: 0.12 });
  // The filter "blat": opens quickly on attack, then settles.
  const tone = filter(s.ctx, 'lowpass', f * 1.2, 1.2, amp);
  tone.frequency.setValueAtTime(f * 1.2, t);
  tone.frequency.linearRampToValueAtTime(Math.min(f * 6 + 900 * vel, 8000), t + 0.05);
  tone.frequency.setTargetAtTime(Math.min(f * 3, 5000), t + 0.05, 0.15);
  const voices = [-6, 6].map((cents) => osc(s.ctx, 'sawtooth', f, t, end, tone, cents));
  vibrato(s.ctx, voices, t, end, 5.5, 8, 0.35);
};

const lead: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.14 * vel, { a: 0.012, d: 0.2, s: 0.7, r: 0.1 });
  const tone = filter(s.ctx, 'lowpass', Math.min(f * 5, 7000), 0.8, amp);
  const voices = [osc(s.ctx, 'square', f, t, end, tone), osc(s.ctx, 'sawtooth', f, t, end, gain(s.ctx, 0.5, tone), 5)];
  vibrato(s.ctx, voices, t, end, 5.8, 11, 0.2);
};

const bass: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.42 * vel, { a: 0.005, d: 0.3, s: 0.6, r: 0.08 });
  const tone = filter(s.ctx, 'lowpass', f * 8, 1, amp);
  tone.frequency.setTargetAtTime(f * 3, t, 0.08);
  osc(s.ctx, 'triangle', f, t, end, tone);
  osc(s.ctx, 'square', f, t, end, gain(s.ctx, 0.25, tone));
};

const organ: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.08 * vel, { a: 0.04, d: 0.1, s: 1, r: 0.2 });
  osc(s.ctx, s.organWave, f, t, end, amp);
  osc(s.ctx, s.organWave, f, t, end, amp, 5);
};

const choir: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.1 * vel, { a: 0.35, d: 0.3, s: 0.9, r: 0.55 });
  // Two vowel formants ("ah") plus a little low body.
  const mix = s.ctx.createGain();
  mix.connect(filter(s.ctx, 'bandpass', 800, 5, gain(s.ctx, 3, amp)));
  mix.connect(filter(s.ctx, 'bandpass', 1150, 7, gain(s.ctx, 2.5, amp)));
  mix.connect(filter(s.ctx, 'lowpass', 600, 0.5, gain(s.ctx, 0.5, amp)));
  const voices = [-10, 0, 10].map((cents) => osc(s.ctx, 'sawtooth', f, t, end, mix, cents));
  vibrato(s.ctx, voices, t, end, 4.8, 9, 0.3);
};

const bell: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.16 * vel, { a: 0.002, d: 2.6, s: 0, r: 1.2 });
  fm(s, amp, f, 3.5, 2.2, 0.5, t, end);
};

const celesta: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.22 * vel, { a: 0.002, d: 1.2, s: 0, r: 0.6 });
  fm(s, amp, f, 4, 1.2, 0.15, t, end);
};

const timpani: NoteFn = (s, out, midi, t, gate, vel) => {
  const f = midiToFreq(midi);
  const [amp, end] = voiceAmp(s, out, t, gate, 0.55 * vel, { a: 0.003, d: 1.3, s: 0, r: 0.7 });
  const head = osc(s.ctx, 'sine', f * 1.3, t, end, amp);
  head.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  // Inharmonic membrane partials, decaying faster than the fundamental.
  const partials = s.ctx.createGain();
  applyEnvelope(partials.gain, t, t, 0.3, { a: 0.002, d: 0.4, s: 0, r: 0.1 });
  partials.connect(amp);
  osc(s.ctx, 'sine', f * 1.5, t, end, partials);
  osc(s.ctx, 'sine', f * 1.99, t, end, gain(s.ctx, 0.5, partials));
  const thump = s.ctx.createGain();
  applyEnvelope(thump.gain, t, t, 0.4, { a: 0.001, d: 0.06, s: 0, r: 0.02 });
  noise(s.ctx, s.noise, t, t + 0.08, filter(s.ctx, 'lowpass', 500, 0.7, thump));
  thump.connect(amp);
};

/** Pitch-dropping sine (kick, toms). */
function drumBody(s: Synth, out: AudioNode, t: number, from: number, to: number, drop: number, decay: number, peak: number): void {
  const amp = s.ctx.createGain();
  amp.connect(out);
  const end = applyEnvelope(amp.gain, t, t, peak, { a: 0.002, d: decay, s: 0, r: 0.05 });
  const o = osc(s.ctx, 'sine', from, t, end, amp);
  o.frequency.exponentialRampToValueAtTime(to, t + drop);
}

/** Filtered noise burst (snare, hats, cymbals). */
function drumNoise(s: Synth, out: AudioNode, t: number, type: BiquadFilterType, freq: number, decay: number, peak: number): void {
  const amp = s.ctx.createGain();
  amp.connect(out);
  const end = applyEnvelope(amp.gain, t, t, peak, { a: 0.001, d: decay, s: 0, r: 0.05 });
  noise(s.ctx, s.noise, t, end, filter(s.ctx, type, freq, 0.8, amp));
}

export const DRUMS: Record<DrumId, DrumFn> = {
  k: (s, out, t, vel) => {
    drumBody(s, out, t, 160, 45, 0.09, 0.38, 0.9 * vel);
    drumNoise(s, out, t, 'highpass', 1500, 0.02, 0.25 * vel);
  },
  s: (s, out, t, vel) => {
    drumNoise(s, out, t, 'highpass', 1100, 0.2, 0.42 * vel);
    drumBody(s, out, t, 190, 150, 0.05, 0.1, 0.35 * vel);
  },
  h: (s, out, t, vel) => drumNoise(s, out, t, 'highpass', 7000, 0.05, 0.2 * vel),
  o: (s, out, t, vel) => drumNoise(s, out, t, 'highpass', 6000, 0.35, 0.14 * vel),
  c: (s, out, t, vel) => {
    drumNoise(s, out, t, 'highpass', 3500, 1.6, 0.2 * vel);
    drumNoise(s, out, t, 'bandpass', 5200, 0.6, 0.12 * vel);
  },
  t: (s, out, t, vel) => {
    drumBody(s, out, t, 135, 85, 0.12, 0.38, 0.6 * vel);
    drumNoise(s, out, t, 'lowpass', 1200, 0.04, 0.12 * vel);
  },
  m: (s, out, t, vel) => {
    drumBody(s, out, t, 195, 125, 0.1, 0.32, 0.55 * vel);
    drumNoise(s, out, t, 'lowpass', 1500, 0.04, 0.12 * vel);
  },
};

/** Pitched instruments ('drums' events are played through DRUMS instead). */
export const INSTRUMENTS: Record<Exclude<InstrumentId, 'drums'>, NoteFn> = {
  harp,
  pluck,
  strings,
  flute,
  brass,
  lead,
  bass,
  organ,
  choir,
  bell,
  celesta,
  timpani,
};
