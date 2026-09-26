// Small helpers for building short-lived Web Audio voice graphs.

export const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export interface Envelope {
  /** Attack time (s), linear from 0 to peak. */
  a: number;
  /** Decay: time constant-ish (s) to fall to the sustain level; with s = 0, the time to fade out. */
  d: number;
  /** Sustain level as a fraction of peak. 0 = percussive (the note rings out over `d`). */
  s: number;
  /** Release time (s) after the gate closes. */
  r: number;
}

/**
 * Schedules an envelope on `param` for a note starting at `t` whose gate closes at `gateEnd`.
 * Returns the time at which the voice is silent and its sources can be stopped.
 */
export function applyEnvelope(param: AudioParam, t: number, gateEnd: number, peak: number, e: Envelope): number {
  const decayStart = t + e.a;
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, decayStart);
  if (e.s > 0) param.setTargetAtTime(peak * e.s, decayStart, e.d / 3);
  else param.setTargetAtTime(0, decayStart, e.d / 5);

  const release = Math.max(gateEnd, decayStart + 0.001);
  const ringOut = decayStart + e.d;
  if (e.s === 0 && ringOut <= release) return ringOut;
  param.setTargetAtTime(0, release, e.r / 5);
  return e.s === 0 ? Math.min(ringOut, release + e.r) : release + e.r;
}

export function gain(ctx: BaseAudioContext, value: number, dest: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  g.connect(dest);
  return g;
}

export function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  freq: number,
  q: number,
  dest: AudioNode,
): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(dest);
  return f;
}

/** Starts an oscillator at `t`, stops it at `end`, connected to `dest`. */
export function osc(
  ctx: BaseAudioContext,
  type: OscillatorType | PeriodicWave,
  freq: number,
  t: number,
  end: number,
  dest: AudioNode,
  detuneCents = 0,
): OscillatorNode {
  const o = ctx.createOscillator();
  if (type instanceof PeriodicWave) o.setPeriodicWave(type);
  else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detuneCents;
  o.connect(dest);
  o.start(t);
  o.stop(end);
  return o;
}

/** Plays looping white noise from a random offset between `t` and `end`. */
export function noise(ctx: BaseAudioContext, buffer: AudioBuffer, t: number, end: number, dest: AudioNode): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(dest);
  src.start(t, Math.random() * buffer.duration);
  src.stop(end);
}

/** Delayed vibrato: an LFO (depth in cents) that fades in after `delay` seconds. */
export function vibrato(
  ctx: BaseAudioContext,
  targets: OscillatorNode[],
  t: number,
  end: number,
  rateHz: number,
  cents: number,
  delay: number,
): void {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rateHz;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.setValueAtTime(0, t + delay);
  depth.gain.linearRampToValueAtTime(cents, t + delay + 0.4);
  lfo.connect(depth);
  for (const o of targets) depth.connect(o.detune);
  lfo.start(t);
  lfo.stop(end);
}

export function whiteNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
