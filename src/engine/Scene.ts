import type { Game } from './Game';

/** Any scene regardless of result type (the stack holds mixed scenes). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyScene = Scene<any>;

/**
 * A screen or overlay managed by the Game's scene stack.
 *
 * Scenes can produce a result: `await game.run(new SomeMenu())` pushes the
 * scene and resolves with the value passed to `finish()`. This lets game
 * scripts be written as straightforward async code.
 */
export abstract class Scene<R = void> {
  /** Set by the Game when the scene is pushed. */
  game!: Game;
  /** When true, the scene below is rendered first (dialogs, menus over the map). */
  transparent = false;

  private resolveResult!: (value: R) => void;
  readonly result: Promise<R> = new Promise<R>((resolve) => {
    this.resolveResult = resolve;
  });

  abstract update(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  /** Called when pushed onto the stack. */
  onEnter(): void {}
  /** Called when removed from the stack. */
  onExit(): void {}
  /** Called when a scene above this one is removed and this becomes the top scene again. */
  onResume(): void {}

  /** Removes this scene from the stack and resolves its result. */
  protected finish(value: R): void {
    this.game.remove(this);
    this.resolveResult(value);
  }
}
