// Public audio API for the game: music, jingles and sound effects, all synthesized at runtime.
//
// Nothing touches Web Audio until unlock() is called from a user gesture. Requests made before
// that are remembered (the latest music request starts on unlock). Without Web Audio support,
// every call is a silent no-op.

import { SongPlayer } from './player';
import { playSfx as playSfxOn } from './sfx';
import { compileSong, type CompiledSong, type SongDef } from './song';
import { Synth } from './synth';
import { JINGLES, MUSIC } from './tracks';

export type MusicId = 'title' | 'overworld' | 'town' | 'dungeon' | 'battle' | 'boss' | 'victory' | 'gameover' | 'ending';
export type JingleId = 'inn' | 'item' | 'levelup' | 'save';
export type SfxId =
  | 'cursor' | 'confirm' | 'cancel' | 'buzzer'        // menus
  | 'step' | 'door' | 'chest' | 'stairs'              // field
  | 'encounter'                                       // battle start "shatter/swirl" whoosh
  | 'slash' | 'hit' | 'critical' | 'miss' | 'enemyDie' | 'bossDie' | 'run' | 'defend'
  | 'fire' | 'ice' | 'bolt' | 'heal' | 'revive' | 'buff' | 'poison' | 'enemyAttack' | 'magicCharge';

export interface AudioSystem {
  /** Must be called from a user gesture (keydown/click) to resume the AudioContext; safe to call repeatedly. */
  unlock(): void;
  /** Starts a looping track (crossfades/fades from the current one). No-op if that track is already playing. 'victory' and 'gameover' play an intro then loop a short section; 'ending' may loop. */
  playMusic(id: MusicId, fadeMs?: number): void;
  stopMusic(fadeMs?: number): void;
  currentMusic(): MusicId | null;
  /** Pauses current music, plays a short jingle, then resumes the music where it was (or restarts it). Returns a promise resolved when the jingle finishes. */
  playJingle(id: JingleId): Promise<void>;
  playSfx(id: SfxId): void;
  setMusicVolume(v: number): void; // 0..1
  setSfxVolume(v: number): void;   // 0..1
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

const DEFAULT_FADE_MS = 800;
/** How far ahead notes are scheduled. Background tabs throttle timers to ~1 s, so look further ahead there. */
const LOOKAHEAD_S = 0.2;
const HIDDEN_LOOKAHEAD_S = 1.5;
const TICK_MS = 30;
/** Small delay before a newly started song so its first notes are never late. */
const START_DELAY_S = 0.05;
const JINGLE_DUCK_S = 0.12;
const JINGLE_TAIL_S = 0.3;
const RESUME_FADE_S = 0.6;
const JINGLE_RING_MS = 3000;

interface Playing {
  id: MusicId;
  player: SongPlayer;
}

interface ActiveJingle {
  player: SongPlayer;
  /** Music to resume afterwards, and where it was paused. */
  resume: { id: MusicId; tick: number } | null;
  resolve: () => void;
}

class WebAudioSystem implements AudioSystem {
  private ctx: AudioContext | null = null;
  private synth: Synth | null = null;
  /** The music the game asked for; it may be waiting for unlock() or for a jingle to end. */
  private wanted: MusicId | null = null;
  private music: Playing | null = null;
  private jingle: ActiveJingle | null = null;
  private readonly compiled = new Map<SongDef, CompiledSong>();
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  private muted = false;

  unlock(): void {
    if (!this.ctx) {
      const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor({ latencyHint: 'interactive' });
      } catch {
        return;
      }
      this.synth = new Synth(this.ctx);
      this.synth.setMusicVolume(this.musicVolume);
      this.synth.setSfxVolume(this.sfxVolume);
      this.synth.setMuted(this.muted);
      setInterval(() => this.pump(), TICK_MS);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
    if (this.wanted && !this.music && !this.jingle) this.start(this.wanted, 0, 0);
  }

  playMusic(id: MusicId, fadeMs = DEFAULT_FADE_MS): void {
    if (id === this.wanted) return;
    this.wanted = id;
    if (this.jingle) {
      this.jingle.resume = null; // a different song will start from the top after the jingle
      return;
    }
    if (this.synth) this.start(id, fadeMs / 1000, 0);
  }

  stopMusic(fadeMs = DEFAULT_FADE_MS): void {
    this.wanted = null;
    if (this.jingle) this.jingle.resume = null;
    this.fadeOutMusic(fadeMs / 1000);
  }

  currentMusic(): MusicId | null {
    return this.wanted;
  }

  playJingle(id: JingleId): Promise<void> {
    const { synth } = this;
    if (!synth) return Promise.resolve();
    let resume = this.jingle?.resume ?? null;
    if (this.jingle) this.finishJingle(false);
    const now = synth.ctx.currentTime;
    if (this.music) {
      resume = { id: this.music.id, tick: this.music.player.positionAt(now) };
      this.fadeOutMusic(JINGLE_DUCK_S);
    }
    const player = new SongPlayer(synth, this.song(JINGLES[id]), { startTime: now + JINGLE_DUCK_S });
    return new Promise((resolve) => {
      this.jingle = { player, resume, resolve };
    });
  }

  playSfx(id: SfxId): void {
    if (this.synth && this.ctx?.state === 'running') playSfxOn(this.synth, id, this.ctx.currentTime);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    this.synth?.setMusicVolume(v);
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    this.synth?.setSfxVolume(v);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.synth?.setMuted(muted);
  }

  isMuted(): boolean {
    return this.muted;
  }

  private song(def: SongDef): CompiledSong {
    let song = this.compiled.get(def);
    if (!song) {
      song = compileSong(def);
      this.compiled.set(def, song);
    }
    return song;
  }

  /** Starts `id` (crossfading from any current music) at song position `tick`. */
  private start(id: MusicId, fadeSeconds: number, tick: number): void {
    const synth = this.synth!;
    const crossfade = this.music ? fadeSeconds : 0;
    this.fadeOutMusic(fadeSeconds);
    const song = this.song(MUSIC[id]);
    synth.setEchoTime(Math.min(0.45, Math.max(0.15, (60 / song.def.bpm) * 0.75)));
    const player = new SongPlayer(synth, song, {
      startTime: synth.ctx.currentTime + START_DELAY_S,
      startTick: tick,
      fadeIn: tick > 0 ? RESUME_FADE_S : crossfade,
    });
    this.music = { id, player };
  }

  private fadeOutMusic(fadeSeconds: number): void {
    if (!this.music) return;
    const { player } = this.music;
    player.stop(fadeSeconds);
    setTimeout(() => player.dispose(), fadeSeconds * 1000 + 100);
    this.music = null;
  }

  /** Ends the current jingle; resumes the wanted music unless another jingle replaces it. */
  private finishJingle(resumeMusic: boolean): void {
    const jingle = this.jingle!;
    this.jingle = null;
    if (resumeMusic) {
      // Let the last notes ring out naturally under the returning music.
      setTimeout(() => jingle.player.dispose(), JINGLE_RING_MS);
    } else {
      jingle.player.stop(0.05);
      setTimeout(() => jingle.player.dispose(), 200);
    }
    jingle.resolve();
    if (resumeMusic && this.wanted) {
      const tick = jingle.resume?.id === this.wanted ? jingle.resume.tick : 0;
      this.start(this.wanted, 0, tick);
    }
  }

  /** Lookahead scheduler tick. */
  private pump(): void {
    const ctx = this.ctx!;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const horizon = now + (document.hidden ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    this.music?.player.scheduleUntil(horizon);
    if (this.jingle) {
      this.jingle.player.scheduleUntil(horizon);
      if (now >= this.jingle.player.endTime + JINGLE_TAIL_S) this.finishJingle(true);
    }
  }
}

export const audio: AudioSystem = new WebAudioSystem();
