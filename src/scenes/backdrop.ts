import { SCREEN_H, SCREEN_W } from '../engine/constants';
import { createCanvas, ctx2d, seededRandom } from '../gfx/pixelart';

/** A night sky: banded gradient, far mountains and twinkling stars. Shared by the title and ending. */
export class StarryBackdrop {
  private readonly base: HTMLCanvasElement;
  private readonly stars: Array<{ x: number; y: number; phase: number; bright: boolean }> = [];

  constructor(
    private readonly top: [number, number, number] = [8, 8, 32],
    private readonly bottom: [number, number, number] = [48, 32, 88],
  ) {
    this.base = this.paint();
    const rnd = seededRandom(1234);
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: Math.floor(rnd() * SCREEN_W), y: Math.floor(rnd() * 150), phase: rnd() * Math.PI * 2, bright: rnd() < 0.2 });
    }
  }

  private paint(): HTMLCanvasElement {
    const c = createCanvas(SCREEN_W, SCREEN_H);
    const ctx = ctx2d(c);
    const bands = 28;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const col = this.top.map((v, k) => Math.round(v + (this.bottom[k] - v) * t));
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillRect(0, Math.floor((i * SCREEN_H) / bands), SCREEN_W, Math.ceil(SCREEN_H / bands) + 1);
    }
    // Two layers of mountain silhouettes.
    const rnd = seededRandom(99);
    const layer = (baseY: number, amp: number, color: string, freq: number) => {
      ctx.fillStyle = color;
      let h = 0;
      for (let x = 0; x < SCREEN_W; x++) {
        h += (rnd() - 0.5) * 2;
        h *= 0.96;
        const y = Math.round(baseY - Math.abs(Math.sin(x * freq)) * amp - Math.sin(x * freq * 3.1) * amp * 0.25 + h);
        ctx.fillRect(x, y, 1, SCREEN_H - y);
      }
    };
    layer(176, 34, '#1c1438', 0.021);
    layer(196, 20, '#100c22', 0.037);
    return c;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.drawImage(this.base, 0, 0);
    for (const s of this.stars) {
      const tw = Math.sin(time / 700 + s.phase);
      if (tw < -0.6) continue;
      ctx.fillStyle = tw > 0.7 ? '#ffffff' : '#a8a8d8';
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.bright && tw > 0.5) {
        ctx.fillStyle = 'rgba(200,200,255,0.6)';
        ctx.fillRect(s.x - 1, s.y, 3, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 3);
      }
    }
  }
}
