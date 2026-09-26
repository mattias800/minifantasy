import { SCREEN_H, SCREEN_W } from './constants';
import { Input } from './Input';
import type { AnyScene, Scene } from './Scene';

interface Tween {
  elapsed: number;
  duration: number;
  step: (t: number) => void;
  resolve: () => void;
}

/** Longest frame delta we simulate; avoids huge jumps after the tab was in the background. */
const MAX_DT_MS = 50;

/**
 * Owns the canvas, main loop, scene stack, game-time timers and screen-wide
 * effects (fades, flashes, shake).
 */
export class Game {
  readonly ctx: CanvasRenderingContext2D;
  readonly input: Input;
  /** Milliseconds of game time since start. Drives all animation. */
  time = 0;

  private readonly scenes: AnyScene[] = [];
  private readonly tweens: Tween[] = [];
  private overlayColor = '#000';
  private overlayAlpha = 0;
  private shakeTime = 0;
  private shakeStrength = 0;
  private lastFrame = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.input = new Input();
  }

  start(): void {
    this.lastFrame = performance.now();
    const frame = (now: number) => {
      // rAF timestamps can slightly precede performance.now() on the first frame; never go backwards.
      const dt = Math.max(0, Math.min(MAX_DT_MS, now - this.lastFrame));
      this.lastFrame = now;
      this.tick(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- scenes

  get top(): AnyScene | undefined {
    return this.scenes[this.scenes.length - 1];
  }

  push(scene: AnyScene): void {
    scene.game = this;
    this.scenes.push(scene);
    this.input.consume();
    scene.onEnter();
  }

  /** Pushes a scene and resolves with its result once it finishes. */
  run<R>(scene: Scene<R>): Promise<R> {
    this.push(scene);
    return scene.result;
  }

  remove(scene: AnyScene): void {
    const i = this.scenes.indexOf(scene);
    if (i < 0) return;
    const wasTop = i === this.scenes.length - 1;
    this.scenes.splice(i, 1);
    scene.onExit();
    this.input.consume();
    if (wasTop) this.top?.onResume();
  }

  /** Clears the whole stack and starts fresh with one scene. */
  replaceAll(scene: AnyScene): void {
    while (this.scenes.length) {
      const s = this.scenes.pop()!;
      s.onExit();
    }
    this.push(scene);
  }

  // ---------------------------------------------------------------- timing

  /** Calls `step(t)` with t going 0→1 over `ms` of game time. */
  tween(ms: number, step: (t: number) => void = () => {}): Promise<void> {
    return new Promise((resolve) => {
      if (ms <= 0) {
        step(1);
        resolve();
        return;
      }
      step(0);
      this.tweens.push({ elapsed: 0, duration: ms, step, resolve });
    });
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms);
  }

  // ---------------------------------------------------------------- effects

  fadeOut(ms = 300, color = '#000'): Promise<void> {
    this.overlayColor = color;
    const from = this.overlayAlpha;
    return this.tween(ms, (t) => (this.overlayAlpha = from + (1 - from) * t));
  }

  fadeIn(ms = 300): Promise<void> {
    const from = this.overlayAlpha;
    return this.tween(ms, (t) => (this.overlayAlpha = from * (1 - t)));
  }

  /** Quick full-screen colour flash. */
  async flash(color = '#fff', ms = 120): Promise<void> {
    this.overlayColor = color;
    await this.tween(ms, (t) => (this.overlayAlpha = 1 - t));
  }

  shake(strength = 3, ms = 250): void {
    this.shakeStrength = strength;
    this.shakeTime = ms;
  }

  // ---------------------------------------------------------------- loop

  private tick(dt: number): void {
    this.time += dt;
    this.input.update(dt);
    this.updateTweens(dt);
    this.top?.update(dt);
    if (this.shakeTime > 0) this.shakeTime -= dt;
    this.render();
  }

  private updateTweens(dt: number): void {
    // Iterate over a snapshot: completing a tween may start new ones.
    for (const tw of [...this.tweens]) {
      tw.elapsed += dt;
      const t = Math.min(1, tw.elapsed / tw.duration);
      tw.step(t);
      if (t >= 1) {
        this.tweens.splice(this.tweens.indexOf(tw), 1);
        tw.resolve();
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.shakeTime > 0) {
      const s = this.shakeStrength;
      ctx.translate(Math.round((Math.random() * 2 - 1) * s), Math.round((Math.random() * 2 - 1) * s));
    }
    let first = this.scenes.length - 1;
    while (first > 0 && this.scenes[first].transparent) first--;
    for (let i = Math.max(0, first); i < this.scenes.length; i++) this.scenes[i].render(ctx);
    ctx.restore();

    if (this.overlayAlpha > 0) {
      ctx.globalAlpha = this.overlayAlpha;
      ctx.fillStyle = this.overlayColor;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.globalAlpha = 1;
    }
  }
}
