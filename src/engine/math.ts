export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
export const easeInQuad = (t: number): number => t * t;
export const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** A random source returning floats in [0, 1). Injectable for deterministic tests. */
export type Rng = () => number;

export const randInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function weightedPick<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = rng() * total;
  for (const i of items) {
    roll -= i.weight;
    if (roll < 0) return i;
  }
  return items[items.length - 1];
}
