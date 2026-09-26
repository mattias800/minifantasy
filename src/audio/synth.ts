// The mixer graph shared by music and sound effects:
//
//   music/sfx buses (dry, reverb send, echo send; gain = volume)
//        │            │                 │
//        │       reverb (convolver) ◄── echo (feedback delay, SPC700-style)
//        ▼            ▼                 ▼
//      master gain (mute) ─► compressor ─► destination
//
// Works with any BaseAudioContext, so the jukebox can render offline for level checks.

import { whiteNoiseBuffer } from './nodes';

/** A set of sends that sources connect into; all three gains follow the bus volume. */
export interface Bus {
  dry: GainNode;
  reverb: GainNode;
  echo: GainNode;
}

const MASTER_LEVEL = 0.9;

export class Synth {
  readonly ctx: BaseAudioContext;
  /** Two seconds of white noise, shared by drums and sound effects. */
  readonly noise: AudioBuffer;
  /** Additive pipe-organ waveform. */
  readonly organWave: PeriodicWave;
  readonly music: Bus;
  readonly sfx: Bus;
  private readonly master: GainNode;
  private readonly echoDelay: DelayNode;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.noise = whiteNoiseBuffer(ctx, 2);
    const harmonics = [0, 1, 0.7, 0.45, 0.3, 0.2, 0.12, 0.08, 0.05];
    this.organWave = ctx.createPeriodicWave(new Float32Array(harmonics.length), new Float32Array(harmonics));

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_LEVEL;
    this.master.connect(compressor);

    // Reverb: short pre-delay, generated impulse, gentle high cut.
    const reverbIn = ctx.createGain();
    const preDelay = ctx.createDelay(0.1);
    preDelay.delayTime.value = 0.02;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 2.4);
    const reverbTone = ctx.createBiquadFilter();
    reverbTone.type = 'lowpass';
    reverbTone.frequency.value = 5500;
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.7;
    reverbIn.connect(preDelay).connect(convolver).connect(reverbTone).connect(reverbOut).connect(this.master);

    // Echo: feedback delay with darkening repeats, also feeding the reverb a little.
    const echoIn = ctx.createGain();
    this.echoDelay = ctx.createDelay(1);
    this.echoDelay.delayTime.value = 0.3;
    const feedbackTone = ctx.createBiquadFilter();
    feedbackTone.type = 'lowpass';
    feedbackTone.frequency.value = 2800;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.5;
    echoIn.connect(this.echoDelay).connect(feedbackTone).connect(feedback).connect(this.echoDelay);
    feedbackTone.connect(echoOut).connect(this.master);
    echoOut.connect(reverbIn);

    const makeBus = (): Bus => {
      const bus = { dry: ctx.createGain(), reverb: ctx.createGain(), echo: ctx.createGain() };
      bus.dry.connect(this.master);
      bus.reverb.connect(reverbIn);
      bus.echo.connect(echoIn);
      return bus;
    };
    this.music = makeBus();
    this.sfx = makeBus();
  }

  setMusicVolume(v: number): void {
    this.setBusVolume(this.music, v);
  }

  setSfxVolume(v: number): void {
    this.setBusVolume(this.sfx, v);
  }

  setMuted(muted: boolean): void {
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.03);
  }

  /** Echo delay time in seconds; glides so that changing songs doesn't warble the tail. */
  setEchoTime(seconds: number): void {
    this.echoDelay.delayTime.setTargetAtTime(seconds, this.ctx.currentTime, 0.2);
  }

  private setBusVolume(bus: Bus, v: number): void {
    const level = Math.max(0, Math.min(1, v));
    for (const g of [bus.dry, bus.reverb, bus.echo]) g.gain.setTargetAtTime(level, this.ctx.currentTime, 0.03);
  }
}

/** Stereo impulse response: exponentially decaying noise (-60 dB at the end). */
function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  const fadeIn = ctx.sampleRate * 0.004;
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const envelope = Math.exp((-6.9 * i) / length) * Math.min(1, i / fadeIn);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return buf;
}
