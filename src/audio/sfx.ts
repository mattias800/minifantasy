// Synthesized sound effects. Each effect is a short recipe built from three primitives:
// swept tones, swept filtered noise and FM bells (see SfxKit).

import type { SfxId } from './Audio';
import { filter, gain, midiToFreq, noise, osc } from './nodes';
import type { Synth } from './synth';

interface Shape {
  /** Start offset (s) from the effect's start. */
  at?: number;
  /** Total length (s): attack, then an exponential fade over the rest. */
  dur: number;
  peak: number;
  /** Attack time (s); long attacks make swells. Default 3 ms. */
  attack?: number;
  /** Reverb send 0..1. Default 0.15. */
  reverb?: number;
  /** Tremolo: amplitude modulation rate (Hz) and depth (0..1). */
  am?: [rate: number, depth: number];
}

interface ToneShape extends Shape {
  type?: OscillatorType;
  /** Start frequency and (optional) end frequency of an exponential sweep. */
  f0: number;
  f1?: number;
  /** Optional low-pass cutoff to soften bright waveforms. */
  lowpass?: number;
  /** Frequency wobble: rate (Hz) and depth (Hz). */
  fm?: [rate: number, depth: number];
}

interface NoiseShape extends Shape {
  filter: BiquadFilterType;
  /** Filter frequency sweep. */
  f0: number;
  f1?: number;
  q?: number;
}

interface BellShape extends Shape {
  f: number;
  /** Modulator:carrier ratio; non-integer ratios sound metallic. Default 3.5. */
  ratio?: number;
  /** Modulation index (brightness). Default 2. */
  index?: number;
}

/** Builds sound effects starting at context time `t`, routed to the sfx bus. */
class SfxKit {
  constructor(
    private readonly s: Synth,
    private readonly t: number,
  ) {}

  tone(o: ToneShape): void {
    const [start, end, dest] = this.voice(o);
    const target = o.lowpass ? filter(this.s.ctx, 'lowpass', o.lowpass, 0.7, dest) : dest;
    const node = osc(this.s.ctx, o.type ?? 'sine', o.f0, start, end, target);
    if (o.f1) node.frequency.exponentialRampToValueAtTime(o.f1, end);
    if (o.fm) this.lfo(o.fm[0], o.fm[1], start, end, node.frequency);
  }

  noise(o: NoiseShape): void {
    const [start, end, dest] = this.voice(o);
    const f = filter(this.s.ctx, o.filter, o.f0, o.q ?? 1, dest);
    if (o.f1) {
      f.frequency.setValueAtTime(o.f0, start);
      f.frequency.exponentialRampToValueAtTime(o.f1, end);
    }
    noise(this.s.ctx, this.s.noise, start, end, f);
  }

  bell(o: BellShape): void {
    const [start, end, dest] = this.voice(o);
    const carrier = osc(this.s.ctx, 'sine', o.f, start, end, dest);
    const depth = this.s.ctx.createGain();
    depth.gain.setValueAtTime(o.f * (o.index ?? 2), start);
    depth.gain.setTargetAtTime(0, start, o.dur / 4);
    osc(this.s.ctx, 'sine', o.f * (o.ratio ?? 3.5), start, end, depth);
    depth.connect(carrier.frequency);
  }

  /** Creates the envelope gain for one layer; returns [start, end, input node]. */
  private voice(o: Shape): [number, number, AudioNode] {
    const { ctx, sfx } = this.s;
    const start = this.t + (o.at ?? 0);
    const end = start + o.dur;
    const attack = Math.min(o.attack ?? 0.003, o.dur * 0.9);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(o.peak, start + attack);
    amp.gain.setTargetAtTime(0, start + attack, (o.dur - attack) / 5);
    amp.connect(sfx.dry);
    amp.connect(gain(ctx, o.reverb ?? 0.15, sfx.reverb));
    if (!o.am) return [start, end, amp];
    const [rate, depth] = o.am;
    const tremolo = gain(ctx, 1 - depth / 2, amp);
    this.lfo(rate, depth / 2, start, end, tremolo.gain);
    return [start, end, tremolo];
  }

  private lfo(rate: number, depth: number, start: number, end: number, param: AudioParam): void {
    const amount = this.s.ctx.createGain();
    amount.gain.value = depth;
    amount.connect(param);
    osc(this.s.ctx, 'sine', rate, start, end, amount);
  }
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** A blunt impact: pitch-dropping sine thump plus a noise smack. */
function impact(k: SfxKit, at: number, weight: number): void {
  k.tone({ at, f0: 200 * weight, f1: 50, dur: 0.16 * weight, peak: 0.7 });
  k.noise({ at, filter: 'lowpass', f0: 2500 * weight, f1: 350, dur: 0.1 * weight, peak: 0.5 });
}

/** Low explosion: rumbling noise and a sub-bass drop. */
function explosion(k: SfxKit, at: number, size: number): void {
  k.noise({ at, filter: 'lowpass', f0: 2600, f1: 120, q: 0.8, dur: 0.45 * size, peak: 0.45, reverb: 0.4 });
  k.tone({ at, f0: 95, f1: 28, dur: 0.4 * size, peak: 0.55 });
}

const SFX_RECIPES: Record<SfxId, (k: SfxKit) => void> = {
  // --- menus ---
  cursor: (k) => {
    k.tone({ type: 'triangle', f0: 1480, f1: 1320, dur: 0.05, peak: 0.22, reverb: 0.05 });
    k.tone({ f0: 2960, dur: 0.03, peak: 0.06, reverb: 0.05 });
  },
  confirm: (k) => {
    k.tone({ type: 'triangle', f0: 880, dur: 0.07, peak: 0.22 });
    k.tone({ type: 'triangle', at: 0.06, f0: 1320, dur: 0.14, peak: 0.22, reverb: 0.25 });
    k.tone({ at: 0.06, f0: 2640, dur: 0.1, peak: 0.05 });
  },
  cancel: (k) => {
    k.tone({ type: 'triangle', f0: 740, f1: 420, dur: 0.12, peak: 0.24 });
    k.tone({ f0: 370, f1: 210, dur: 0.12, peak: 0.1 });
  },
  buzzer: (k) => {
    for (const at of [0, 0.11]) k.tone({ type: 'square', at, f0: 140, dur: 0.09, peak: 0.14, lowpass: 900, reverb: 0.05 });
  },

  // --- field ---
  step: (k) => k.noise({ filter: 'bandpass', f0: 700, f1: 300, q: 1.5, dur: 0.05, peak: 0.45, reverb: 0 }),
  door: (k) => {
    k.noise({ filter: 'bandpass', f0: 650, f1: 260, q: 4, dur: 0.35, attack: 0.04, peak: 0.28 });
    k.tone({ at: 0.26, f0: 110, f1: 50, dur: 0.25, peak: 0.5 });
    k.noise({ at: 0.26, filter: 'lowpass', f0: 350, dur: 0.12, peak: 0.3 });
  },
  chest: (k) => {
    k.noise({ filter: 'bandpass', f0: 400, f1: 900, q: 4, dur: 0.2, attack: 0.03, peak: 0.22 });
    k.tone({ at: 0.15, f0: 95, f1: 60, dur: 0.15, peak: 0.4 });
    [79, 84, 88, 91].forEach((note, i) =>
      k.bell({ at: 0.24 + i * 0.06, f: midiToFreq(note), ratio: 4, index: 1, dur: 0.6, peak: 0.1, reverb: 0.5 }),
    );
  },
  stairs: (k) => {
    for (let i = 0; i < 4; i++) {
      const at = i * 0.11;
      k.noise({ at, filter: 'bandpass', f0: 900 - i * 150, q: 2, dur: 0.07, peak: 0.25 });
      k.tone({ at, f0: 170 - i * 20, f1: 80, dur: 0.08, peak: 0.25 });
    }
  },

  // --- battle start: rising swirl that shatters ---
  encounter: (k) => {
    k.noise({ filter: 'bandpass', f0: 250, f1: 5000, q: 1.2, dur: 0.62, attack: 0.5, peak: 0.45, reverb: 0.4 });
    k.tone({ type: 'sawtooth', f0: 110, f1: 880, dur: 0.6, attack: 0.45, peak: 0.12, lowpass: 2200 });
    k.tone({ type: 'square', f0: 1760, f1: 220, dur: 0.6, attack: 0.45, peak: 0.05, lowpass: 3000 });
    k.noise({ at: 0.55, filter: 'highpass', f0: 3000, dur: 0.3, peak: 0.35, reverb: 0.5 });
    for (let i = 0; i < 6; i++) k.bell({ at: 0.55 + i * 0.03, f: rand(2000, 5000), dur: 0.25, peak: 0.07, reverb: 0.5 });
    k.tone({ at: 0.55, f0: 120, f1: 40, dur: 0.3, peak: 0.6 });
  },

  // --- combat ---
  slash: (k) => {
    k.noise({ filter: 'bandpass', f0: 4000, f1: 700, q: 1.5, dur: 0.15, attack: 0.03, peak: 1 });
    k.noise({ filter: 'highpass', f0: 6000, dur: 0.08, peak: 0.3 });
  },
  hit: (k) => impact(k, 0, 1),
  critical: (k) => {
    impact(k, 0, 1.3);
    k.noise({ filter: 'highpass', f0: 5000, dur: 0.06, peak: 0.3 });
    k.bell({ f: 1200, ratio: 2.76, index: 3, dur: 0.5, peak: 0.12, reverb: 0.35 });
    impact(k, 0.08, 1);
  },
  miss: (k) => {
    k.noise({ filter: 'bandpass', f0: 900, f1: 2200, q: 2, dur: 0.18, attack: 0.06, peak: 0.6 });
    k.tone({ f0: 600, f1: 900, dur: 0.12, peak: 0.08 });
  },
  enemyDie: (k) => {
    k.noise({ filter: 'lowpass', f0: 5000, f1: 150, q: 4, dur: 0.7, attack: 0.02, peak: 0.35, reverb: 0.3 });
    k.tone({ type: 'sawtooth', f0: 900, f1: 80, dur: 0.6, peak: 0.1, lowpass: 2500, fm: [30, 40] });
  },
  bossDie: (k) => {
    [0, 0.25, 0.5, 0.75, 1.0, 1.3].forEach((at) => explosion(k, at, 1));
    explosion(k, 1.5, 2.8);
    k.tone({ type: 'sawtooth', f0: 600, f1: 40, dur: 2.2, peak: 0.1, lowpass: 1200 });
  },
  run: (k) => {
    for (const at of [0, 0.07, 0.14]) k.noise({ at, filter: 'bandpass', f0: 1200, q: 2, dur: 0.05, peak: 0.45 });
    k.noise({ at: 0.15, filter: 'bandpass', f0: 600, f1: 3000, q: 1.5, dur: 0.3, attack: 0.1, peak: 0.6 });
  },
  defend: (k) => {
    k.bell({ f: 700, ratio: 1.41, index: 4, dur: 0.45, peak: 0.2, reverb: 0.3 });
    k.noise({ filter: 'bandpass', f0: 3000, q: 3, dur: 0.08, peak: 0.2 });
    k.tone({ type: 'triangle', f0: 350, f1: 700, dur: 0.15, peak: 0.1 });
  },
  enemyAttack: (k) => {
    k.noise({ filter: 'bandpass', f0: 1500, f1: 400, q: 1.5, dur: 0.12, peak: 0.35 });
    k.tone({ type: 'sawtooth', at: 0.06, f0: 150, f1: 60, dur: 0.25, peak: 0.25, lowpass: 800 });
    impact(k, 0.08, 0.9);
  },

  // --- magic ---
  fire: (k) => {
    k.noise({ filter: 'lowpass', f0: 800, f1: 3500, dur: 0.7, attack: 0.15, peak: 0.8, am: [18, 0.6], reverb: 0.3 });
    k.noise({ filter: 'bandpass', f0: 200, f1: 500, q: 2, dur: 0.8, attack: 0.1, peak: 0.35 });
    for (let i = 0; i < 8; i++) k.noise({ at: rand(0.05, 0.6), filter: 'highpass', f0: 3000, dur: 0.03, peak: 0.15 });
  },
  ice: (k) => {
    k.noise({ filter: 'highpass', f0: 6000, dur: 0.6, attack: 0.1, peak: 0.12, reverb: 0.6 });
    for (let i = 0; i < 7; i++) k.bell({ at: i * 0.06, f: rand(1800, 4200), ratio: 3.01, dur: 0.5, peak: 0.08, reverb: 0.5 });
    k.noise({ at: 0.45, filter: 'highpass', f0: 2500, dur: 0.12, peak: 0.3 });
  },
  bolt: (k) => {
    k.tone({ type: 'sawtooth', f0: 2400, f1: 120, dur: 0.35, peak: 0.18, lowpass: 5000, fm: [70, 300] });
    k.noise({ filter: 'highpass', f0: 1500, dur: 0.25, peak: 0.45 });
    k.noise({ at: 0.12, filter: 'highpass', f0: 2500, dur: 0.15, peak: 0.3 });
    k.tone({ at: 0.05, f0: 100, f1: 40, dur: 0.4, peak: 0.5 });
  },
  heal: (k) => {
    [72, 76, 79, 84, 88, 91].forEach((note, i) =>
      k.bell({ at: i * 0.07, f: midiToFreq(note), ratio: 4, index: 1, dur: 0.6, peak: 0.1, reverb: 0.5 }),
    );
    k.tone({ f0: 523, f1: 1046, dur: 0.6, attack: 0.2, peak: 0.06, reverb: 0.5 });
  },
  revive: (k) => {
    k.tone({ f0: 220, f1: 880, dur: 1.0, attack: 0.7, peak: 0.1, fm: [6, 8], reverb: 0.5 });
    [69, 73, 76, 81, 85, 88, 93].forEach((note, i) =>
      k.bell({ at: i * 0.1, f: midiToFreq(note), ratio: 4, index: 1, dur: 0.7, peak: 0.09, reverb: 0.5 }),
    );
    for (const note of [69, 73, 76]) {
      k.tone({ type: 'triangle', at: 0.6, f0: midiToFreq(note), dur: 0.9, attack: 0.2, peak: 0.07, reverb: 0.6 });
    }
  },
  buff: (k) => {
    k.tone({ type: 'triangle', f0: 400, f1: 1200, dur: 0.45, attack: 0.1, peak: 0.25, fm: [12, 20] });
    k.bell({ at: 0.3, f: 2093, ratio: 4, index: 1, dur: 0.4, peak: 0.08, reverb: 0.4 });
    k.bell({ at: 0.38, f: 2637, ratio: 4, index: 1, dur: 0.4, peak: 0.08, reverb: 0.4 });
  },
  poison: (k) => {
    for (let i = 0; i < 5; i++) {
      const f0 = rand(300, 600);
      k.tone({ at: i * 0.08, f0, f1: f0 * 0.5, dur: 0.08, peak: 0.2 });
    }
    k.tone({ type: 'square', f0: 110, f1: 104, dur: 0.45, peak: 0.06, lowpass: 600 });
    k.tone({ type: 'square', f0: 116.5, f1: 110, dur: 0.45, peak: 0.06, lowpass: 600 });
  },
  magicCharge: (k) => {
    k.tone({ f0: 300, f1: 1200, dur: 0.7, attack: 0.6, peak: 0.12, fm: [9, 15] });
    k.tone({ type: 'triangle', f0: 450, f1: 1800, dur: 0.7, attack: 0.6, peak: 0.06 });
    k.noise({ filter: 'bandpass', f0: 500, f1: 4000, q: 4, dur: 0.7, attack: 0.6, peak: 0.15, reverb: 0.4 });
  },
};

export const SFX_IDS = Object.keys(SFX_RECIPES) as SfxId[];

/** Plays a sound effect at context time `t`. */
export function playSfx(s: Synth, id: SfxId, t: number): void {
  SFX_RECIPES[id](new SfxKit(s, t));
}
