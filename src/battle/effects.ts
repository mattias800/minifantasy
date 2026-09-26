/**
 * Procedural battle animations (slashes, spells, heals…), drawn with
 * pixel-sized rectangles so they match the art style.
 *
 * Every renderer is a pure function of normalized time t∈[0,1] and a target
 * point, which keeps effects stateless and easy to add.
 */
import type { AnimId } from '../data/types';
import { SCREEN_H, SCREEN_W } from '../engine/constants';

export interface Point {
  x: number;
  y: number;
}

type Renderer = (ctx: CanvasRenderingContext2D, t: number, p: Point, index: number) => void;

interface ActiveEffect {
  elapsed: number;
  duration: number;
  targets: Point[];
  render: Renderer;
  /** Optional whole-screen flash drawn once per effect. */
  screenFlash?: { color: string; at: number; width: number };
  resolve: () => void;
}

// ------------------------------------------------------------------ drawing helpers

/** Deterministic pseudo-random in [0,1) from integers. */
function hash(a: number, b = 0): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  const s = Math.max(1, Math.round(size));
  ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, width = 1): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    ctx.fillRect(x - Math.floor(width / 2), y - Math.floor(width / 2), width, width);
  }
}

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, thickness = 1): void {
  if (r <= 0) return;
  ctx.fillStyle = color;
  const steps = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), thickness, thickness);
  }
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let dy = -Math.floor(r); dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillRect(rx, ry - size, 1, size * 2 + 1);
  ctx.fillRect(rx - size, ry, size * 2 + 1, 1);
}

function withAlpha(ctx: CanvasRenderingContext2D, alpha: number, draw: () => void): void {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
  draw();
  ctx.restore();
}

const fadeOut = (t: number, from: number) => (t < from ? 1 : 1 - (t - from) / (1 - from));

// ------------------------------------------------------------------ renderers

const slash: Renderer = (ctx, t, p) => {
  for (let j = 0; j < 3; j++) {
    const start = j * 0.12;
    const reveal = Math.min(1, Math.max(0, (t - start) / 0.35));
    if (reveal <= 0) continue;
    const off = (j - 1) * 6;
    const x0 = p.x + 14 + off;
    const y0 = p.y - 16;
    const x1 = x0 - 28 * reveal;
    const y1 = y0 + 32 * reveal;
    withAlpha(ctx, fadeOut(t, 0.6), () => {
      line(ctx, x0 + 1, y0, x1 + 1, y1, '#9ad8ff', 1);
      line(ctx, x0, y0, x1, y1, '#ffffff', 2);
    });
  }
};

const claw: Renderer = (ctx, t, p) => {
  for (let j = 0; j < 3; j++) {
    const reveal = Math.min(1, t / 0.4);
    const off = (j - 1) * 5;
    const x0 = p.x - 12 + off;
    const y0 = p.y - 14;
    withAlpha(ctx, fadeOut(t, 0.55), () => {
      line(ctx, x0, y0, x0 + 20 * reveal, y0 + 26 * reveal, '#ff5050', 2);
      line(ctx, x0, y0, x0 + 20 * reveal, y0 + 26 * reveal, '#ffffff', 1);
    });
  }
};

const bash: Renderer = (ctx, t, p) => {
  const len = 4 + t * 14;
  withAlpha(ctx, fadeOut(t, 0.5), () => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const x0 = p.x + Math.cos(a) * len * 0.4;
      const y0 = p.y + Math.sin(a) * len * 0.4;
      line(ctx, x0, y0, p.x + Math.cos(a) * len, p.y + Math.sin(a) * len, i % 2 ? '#ffe070' : '#ffffff', 2);
    }
    disc(ctx, p.x, p.y, 5 * (1 - t), '#ffffff');
  });
};

const bite: Renderer = (ctx, t, p) => {
  const close = Math.min(1, t / 0.45);
  const gap = 14 * (1 - close);
  withAlpha(ctx, fadeOut(t, 0.6), () => {
    ctx.fillStyle = '#ffffff';
    for (let i = -2; i <= 2; i++) {
      const x = p.x + i * 5;
      // Each fang is a small triangle narrowing towards its tip.
      for (let k = 0; k < 5; k++) {
        const half = 2 - Math.floor(k / 2);
        ctx.fillRect(x - half, p.y - gap - 6 + k, half * 2 + 1, 1); // upper jaw
        ctx.fillRect(x - half, p.y + gap + 6 - k, half * 2 + 1, 1); // lower jaw
      }
    }
  });
};

const FIRE_COLORS = ['#ffffff', '#fff27a', '#ffb13b', '#ff6a1f', '#c8261a'];
const fire: Renderer = (ctx, t, p, idx) => {
  // A roaring blaze at the target's feet that swells and dies down...
  const swell = Math.sin(Math.min(1, t / 0.85) * Math.PI);
  if (swell > 0) {
    withAlpha(ctx, 0.45 * swell, () => disc(ctx, p.x, p.y + 10, 16 * swell, '#ff7a1f'));
    withAlpha(ctx, 0.7 * swell, () => disc(ctx, p.x, p.y + 10, 9 * swell, '#ffd23f'));
  }
  // ...with tongues of flame licking upwards.
  for (let i = 0; i < 56; i++) {
    const delay = hash(i, idx) * 0.5;
    const life = 0.35 + hash(i, 7) * 0.25;
    const a = (t - delay) / life;
    if (a < 0 || a > 1) continue;
    const x = p.x + (hash(i, 3) - 0.5) * 34 * (1 - a * 0.4) + Math.sin(a * 7 + i) * 2;
    const y = p.y + 16 - a * (30 + hash(i, 5) * 18);
    const color = FIRE_COLORS[Math.min(FIRE_COLORS.length - 1, Math.floor(a * FIRE_COLORS.length))];
    dot(ctx, x, y, 6 - a * 4.5, color);
  }
};

const ice: Renderer = (ctx, t, p) => {
  const n = 8;
  if (t < 0.55) {
    const k = t / 0.55;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 2;
      const r = 28 * (1 - k) + 4;
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r * 0.8;
      ctx.fillStyle = '#bff4ff';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 3);
    }
  } else {
    const k = (t - 0.55) / 0.45;
    withAlpha(ctx, 1 - k, () => {
      // big crystal
      const h = 22;
      for (let dy = -h; dy <= h; dy++) {
        const w = Math.round((1 - Math.abs(dy) / h) * 9);
        ctx.fillStyle = dy < 0 ? '#e6fbff' : '#7fd6f5';
        ctx.fillRect(p.x - w, p.y + dy, w * 2 + 1, 1);
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        sparkle(ctx, p.x + Math.cos(a) * (8 + k * 20), p.y + Math.sin(a) * (8 + k * 16), 2, '#ffffff');
      }
    });
  }
};

const bolt: Renderer = (ctx, t, p, idx) => {
  if (t > 0.75) return;
  const frame = Math.floor(t * 20);
  let x = p.x + (hash(frame, idx) - 0.5) * 10;
  let y = 0;
  const segs = 9;
  const dy = (p.y + 4) / segs;
  for (let s = 0; s < segs; s++) {
    const nx = s === segs - 1 ? p.x : p.x + (hash(frame * 13 + s, idx) - 0.5) * 22;
    const ny = y + dy;
    line(ctx, x, y, nx, ny, '#fff27a', 3);
    line(ctx, x, y, nx, ny, '#ffffff', 1);
    x = nx;
    y = ny;
  }
  for (let i = 0; i < 6; i++) {
    const a = hash(i, frame) * Math.PI * 2;
    sparkle(ctx, p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 10, 2, '#fff8b0');
  }
};

const holy: Renderer = (ctx, t, p) => {
  const w = Math.round(Math.sin(Math.min(1, t / 0.8) * Math.PI) * 12);
  if (w > 0) {
    withAlpha(ctx, 0.85, () => {
      ctx.fillStyle = '#fff6c0';
      ctx.fillRect(p.x - w, 0, w * 2, p.y + 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - Math.floor(w / 2), 0, w, p.y + 16);
    });
  }
  for (let i = 0; i < 14; i++) {
    const a = (t * 1.6 + hash(i)) % 1;
    const x = p.x + (hash(i, 2) - 0.5) * 36;
    const y = p.y + 16 - a * 50;
    sparkle(ctx, x, y, 1 + (i % 2), i % 3 ? '#ffffff' : '#ffe070');
  }
};

const quake: Renderer = (ctx, t, p) => {
  for (let i = 0; i < 12; i++) {
    const delay = hash(i, 1) * 0.5;
    const a = Math.min(1, Math.max(0, (t - delay) / 0.35));
    if (a <= 0) continue;
    const x = p.x + (hash(i, 2) - 0.5) * 40;
    const y = -10 + a * (p.y + 14 + hash(i, 3) * 8);
    const s = 3 + Math.floor(hash(i, 4) * 3);
    withAlpha(ctx, fadeOut(t, 0.8), () => {
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
      ctx.fillStyle = '#a9825a';
      ctx.fillRect(Math.round(x), Math.round(y), s - 1, 1);
    });
  }
};

const nova: Renderer = (ctx, t, p) => {
  const colors = ['#ffffff', '#ff9ef0', '#9ec8ff'];
  for (let k = 0; k < 3; k++) {
    const a = t * 1.3 - k * 0.15;
    if (a <= 0 || a >= 1) continue;
    withAlpha(ctx, 1 - a, () => ring(ctx, p.x, p.y, 4 + a * 36, colors[k], 2));
  }
  if (t < 0.4) withAlpha(ctx, 1 - t / 0.4, () => disc(ctx, p.x, p.y, 10 * (t / 0.4) + 2, '#ffffff'));
  for (let i = 0; i < 16; i++) {
    const ang = hash(i) * Math.PI * 2;
    const r = t * (30 + hash(i, 1) * 20);
    withAlpha(ctx, 1 - t, () => sparkle(ctx, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8, 2, colors[i % 3]));
  }
};

const shadow: Renderer = (ctx, t, p, idx) => {
  for (let i = 0; i < 10; i++) {
    const delay = hash(i, idx) * 0.4;
    const a = (t - delay) / 0.5;
    if (a < 0 || a > 1) continue;
    const x = p.x + (hash(i, 2) - 0.5) * 34;
    const y = p.y + (hash(i, 3) - 0.5) * 26 - a * 6;
    withAlpha(ctx, 0.8 * (1 - a), () => {
      disc(ctx, x, y, 3 + a * 7, '#2a0f3f');
      disc(ctx, x - 1, y - 1, 1 + a * 4, '#6a2a8f');
    });
  }
};

const heal: Renderer = (ctx, t, p) => {
  for (let i = 0; i < 16; i++) {
    const a = (t * 1.2 + hash(i) * 0.6) % 1;
    const ang = hash(i, 1) * Math.PI * 2 + t * 5;
    const r = 10 + hash(i, 2) * 6;
    const x = p.x + Math.cos(ang) * r;
    const y = p.y + 14 - a * 36;
    withAlpha(ctx, fadeOut(t, 0.75), () => sparkle(ctx, x, y, i % 2 ? 1 : 2, i % 3 ? '#b8ffc8' : '#ffffff'));
  }
  withAlpha(ctx, 0.5 * Math.sin(t * Math.PI), () => ring(ctx, p.x, p.y + 12, 8 + t * 8, '#80ff9a', 1));
};

const revive: Renderer = (ctx, t, p) => {
  withAlpha(ctx, 0.5 * Math.sin(t * Math.PI), () => disc(ctx, p.x, p.y, 16, '#fff2b0'));
  for (let i = 0; i < 14; i++) {
    const a = (t + hash(i) * 0.5) % 1;
    const x = p.x + (hash(i, 1) - 0.5) * 30;
    const y = p.y - 30 + a * 44;
    withAlpha(ctx, fadeOut(t, 0.7), () => sparkle(ctx, x, y, 2, i % 2 ? '#ffe070' : '#ffffff'));
  }
};

const buff: Renderer = (ctx, t, p) => {
  for (let k = 0; k < 2; k++) {
    const a = t * 1.5 - k * 0.35;
    if (a <= 0 || a >= 1) continue;
    const r = 18 - a * 6;
    withAlpha(ctx, 1 - a, () => {
      for (let i = 0; i < 6; i++) {
        const a0 = (i / 6) * Math.PI * 2;
        const a1 = ((i + 1) / 6) * Math.PI * 2;
        line(ctx, p.x + Math.cos(a0) * r, p.y + Math.sin(a0) * r, p.x + Math.cos(a1) * r, p.y + Math.sin(a1) * r, '#9ad8ff', 1);
      }
    });
  }
};

function bubbles(color: string, highlight: string): Renderer {
  return (ctx, t, p) => {
    for (let i = 0; i < 12; i++) {
      const a = (t * 1.4 + hash(i) * 0.7) % 1;
      const x = p.x + (hash(i, 1) - 0.5) * 26 + Math.sin(a * 8 + i) * 2;
      const y = p.y + 12 - a * 30;
      withAlpha(ctx, fadeOut(t, 0.7), () => {
        ring(ctx, x, y, 2 + hash(i, 2) * 2, color, 1);
        dot(ctx, x - 1, y - 1, 1, highlight);
      });
    }
  };
}

const ether: Renderer = (ctx, t, p) => {
  for (let i = 0; i < 14; i++) {
    const ang = hash(i) * Math.PI * 2 + t * 6;
    const r = 18 * (1 - t) + 2;
    withAlpha(ctx, fadeOut(t, 0.8), () =>
      sparkle(ctx, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8, 2, i % 2 ? '#9ec8ff' : '#ffffff'),
    );
  }
};

interface AnimSpec {
  duration: number;
  render: Renderer;
  flash?: { color: string; at: number; width: number };
}

const ANIMS: Record<AnimId, AnimSpec> = {
  slash: { duration: 300, render: slash },
  claw: { duration: 300, render: claw },
  bash: { duration: 280, render: bash },
  bite: { duration: 320, render: bite },
  fire: { duration: 750, render: fire },
  ice: { duration: 750, render: ice },
  bolt: { duration: 550, render: bolt, flash: { color: '#ffffff', at: 0.1, width: 0.12 } },
  holy: { duration: 850, render: holy, flash: { color: '#fff6c0', at: 0.3, width: 0.15 } },
  quake: { duration: 800, render: quake },
  nova: { duration: 850, render: nova, flash: { color: '#ffffff', at: 0.02, width: 0.1 } },
  shadow: { duration: 800, render: shadow },
  heal: { duration: 750, render: heal },
  revive: { duration: 900, render: revive },
  buff: { duration: 600, render: buff },
  cure: { duration: 550, render: bubbles('#ffffff', '#c8f0ff') },
  poison: { duration: 650, render: bubbles('#b060e0', '#f0c0ff') },
  ether: { duration: 650, render: ether },
};

/** Plays and draws battle effects; each play() resolves when its animation ends. */
export class EffectLayer {
  private readonly active: ActiveEffect[] = [];

  play(anim: AnimId, targets: Point[]): Promise<void> {
    const spec = ANIMS[anim];
    return new Promise((resolve) => {
      this.active.push({ elapsed: 0, duration: spec.duration, targets, render: spec.render, screenFlash: spec.flash, resolve });
    });
  }

  get busy(): boolean {
    return this.active.length > 0;
  }

  update(dt: number): void {
    for (const e of [...this.active]) {
      e.elapsed += dt;
      if (e.elapsed >= e.duration) {
        this.active.splice(this.active.indexOf(e), 1);
        e.resolve();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const e of this.active) {
      const t = Math.min(1, e.elapsed / e.duration);
      e.targets.forEach((p, i) => e.render(ctx, t, p, i));
      const f = e.screenFlash;
      if (f && t >= f.at && t <= f.at + f.width) {
        withAlpha(ctx, 0.6 * (1 - (t - f.at) / f.width), () => {
          ctx.fillStyle = f.color;
          ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        });
      }
    }
  }
}
