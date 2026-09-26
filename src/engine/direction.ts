export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIR_DELTA: Readonly<Record<Dir, { dx: number; dy: number }>> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE: Readonly<Record<Dir, Dir>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const ALL_DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
