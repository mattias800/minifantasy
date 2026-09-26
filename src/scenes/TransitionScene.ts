import { SCREEN_H, SCREEN_W } from '../engine/constants';
import { Scene } from '../engine/Scene';
import { createCanvas, ctx2d } from '../gfx/pixelart';

const FLASH_MS = 260;
const MOSAIC_MS = 620;

/**
 * The battle "swirl": two quick flashes, then the field shatters into a
 * zooming mosaic and fades to black. Ends with the screen fully faded out.
 */
export class TransitionScene extends Scene {
  private readonly snapshot: HTMLCanvasElement;
  private readonly small: HTMLCanvasElement;
  private elapsed = 0;
  private done = false;

  constructor(source: HTMLCanvasElement) {
    super();
    this.snapshot = createCanvas(SCREEN_W, SCREEN_H);
    ctx2d(this.snapshot).drawImage(source, 0, 0);
    this.small = createCanvas(SCREEN_W, SCREEN_H);
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (!this.done && this.elapsed >= FLASH_MS + MOSAIC_MS) {
      this.done = true;
      void this.game.fadeOut(0).then(() => this.finish());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const e = this.elapsed;
    if (e < FLASH_MS) {
      ctx.drawImage(this.snapshot, 0, 0);
      if (Math.floor(e / 65) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      }
      return;
    }
    const t = Math.min(1, (e - FLASH_MS) / MOSAIC_MS);
    const block = Math.max(1, Math.round(1 + t * t * 28));
    const zoom = 1 + t * 0.6;
    const sw = Math.max(1, Math.ceil(SCREEN_W / block));
    const sh = Math.max(1, Math.ceil(SCREEN_H / block));
    const sctx = ctx2d(this.small);
    sctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    // Downsample a zoomed crop, then scale up without smoothing → blocky mosaic.
    const cropW = SCREEN_W / zoom;
    const cropH = SCREEN_H / zoom;
    sctx.drawImage(this.snapshot, (SCREEN_W - cropW) / 2, (SCREEN_H - cropH) / 2, cropW, cropH, 0, 0, sw, sh);
    ctx.drawImage(this.small, 0, 0, sw, sh, 0, 0, sw * block, sh * block);
    ctx.fillStyle = `rgba(0,0,0,${t})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}
