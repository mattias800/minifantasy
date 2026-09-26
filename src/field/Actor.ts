import { TILE } from '../engine/constants';
import { DIR_DELTA, type Dir } from '../engine/direction';
import { getFieldSprite, type FieldSpriteId } from '../gfx/characters';

/** Walking speeds in tiles per second. */
export const WALK_SPEED = 5;
export const DASH_SPEED = 9;
export const NPC_SPEED = 2.5;

/**
 * Anything that walks on the tile grid: the party leader and NPCs.
 * `x`/`y` is the logical tile (the destination while moving); `px`/`py` the drawn pixel position.
 */
export class Actor {
  px: number;
  py: number;
  visible = true;
  private fromX = 0;
  private fromY = 0;
  private progress = 1;
  private speed = WALK_SPEED;
  /** Distance walked in tiles; drives the walk cycle. */
  private walked = 0;
  private arrive: (() => void) | null = null;

  constructor(
    public sprite: FieldSpriteId,
    public x: number,
    public y: number,
    public facing: Dir = 'down',
  ) {
    this.px = x * TILE;
    this.py = y * TILE;
  }

  get moving(): boolean {
    return this.progress < 1;
  }

  /** Begins a one-tile step (no collision checks — the caller decides). Resolves on arrival. */
  step(dir: Dir, speed: number): Promise<void> {
    this.facing = dir;
    this.fromX = this.x;
    this.fromY = this.y;
    this.x += DIR_DELTA[dir].dx;
    this.y += DIR_DELTA[dir].dy;
    this.speed = speed;
    this.progress = 0;
    return new Promise((resolve) => (this.arrive = resolve));
  }

  placeAt(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.px = x * TILE;
    this.py = y * TILE;
    this.progress = 1;
  }

  /** Advances movement; returns true on the frame the actor arrives at its tile. */
  update(dt: number): boolean {
    if (!this.moving) return false;
    const delta = (dt / 1000) * this.speed;
    this.progress = Math.min(1, this.progress + delta);
    this.walked += delta;
    this.px = Math.round((this.fromX + (this.x - this.fromX) * this.progress) * TILE);
    this.py = Math.round((this.fromY + (this.y - this.fromY) * this.progress) * TILE);
    if (this.progress >= 1) {
      const done = this.arrive;
      this.arrive = null;
      done?.();
      return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (!this.visible) return;
    const frame = this.moving ? ((Math.floor(this.walked * 2) % 2) as 0 | 1) : 0;
    ctx.drawImage(getFieldSprite(this.sprite, this.facing, frame), this.px - camX, this.py - camY);
  }
}
