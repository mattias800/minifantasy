/**
 * Keyboard + gamepad input mapped to abstract actions.
 *
 * Call `update()` once per frame before game logic; then query:
 *  - `held(a)`     the action is currently down
 *  - `pressed(a)`  the action went down this frame
 *  - `repeat(a)`   like pressed, but auto-repeats while held (for menus)
 */
export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu' | 'dash';

const KEY_BINDINGS: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyZ: 'confirm',
  Enter: 'confirm',
  Space: 'confirm',
  KeyX: 'cancel',
  Escape: 'cancel',
  Backspace: 'cancel',
  KeyC: 'menu',
  Tab: 'menu',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
};

/** Standard-mapping gamepad buttons. */
const PAD_BINDINGS: Record<number, Action> = {
  0: 'confirm', // A / Cross
  1: 'cancel', // B / Circle
  2: 'dash', // X / Square
  3: 'menu', // Y / Triangle
  9: 'menu', // Start
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

const REPEAT_DELAY_MS = 260;
const REPEAT_INTERVAL_MS = 75;
const STICK_DEADZONE = 0.5;

const ALL_ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'dash'];

export class Input {
  private readonly keysDown = new Set<Action>();
  private readonly current = new Set<Action>();
  private readonly previous = new Set<Action>();
  private readonly heldTime = new Map<Action, number>();
  private readonly repeated = new Set<Action>();
  /** Listeners invoked on any key/button press — used to unlock audio on first interaction. */
  private readonly anyPressListeners: Array<() => void> = [];
  /** Raw key listeners for global hotkeys (fullscreen, mute) handled outside the action system. */
  private readonly rawKeyListeners: Array<(code: string) => void> = [];

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const action = KEY_BINDINGS[e.code];
      if (action) {
        e.preventDefault();
        this.keysDown.add(action);
      }
      if (!e.repeat) {
        this.anyPressListeners.forEach((fn) => fn());
        this.rawKeyListeners.forEach((fn) => fn(e.code));
      }
    });
    target.addEventListener('keyup', (e) => {
      const action = KEY_BINDINGS[e.code];
      if (action) this.keysDown.delete(action);
    });
    target.addEventListener('blur', () => this.keysDown.clear());
    target.addEventListener('pointerdown', () => this.anyPressListeners.forEach((fn) => fn()));
  }

  onAnyPress(fn: () => void): void {
    this.anyPressListeners.push(fn);
  }

  onRawKey(fn: (code: string) => void): void {
    this.rawKeyListeners.push(fn);
  }

  update(dtMs: number): void {
    this.previous.clear();
    this.current.forEach((a) => this.previous.add(a));
    this.current.clear();
    this.keysDown.forEach((a) => this.current.add(a));
    this.pollGamepads();

    this.repeated.clear();
    for (const a of ALL_ACTIONS) {
      if (!this.current.has(a)) {
        this.heldTime.delete(a);
        continue;
      }
      const before = this.heldTime.get(a);
      if (before === undefined) {
        this.heldTime.set(a, 0);
        this.repeated.add(a);
        continue;
      }
      const after = before + dtMs;
      this.heldTime.set(a, after);
      if (after >= REPEAT_DELAY_MS) {
        const n0 = Math.floor((before - REPEAT_DELAY_MS) / REPEAT_INTERVAL_MS);
        const n1 = Math.floor((after - REPEAT_DELAY_MS) / REPEAT_INTERVAL_MS);
        if (before < REPEAT_DELAY_MS || n1 > n0) this.repeated.add(a);
      }
    }
  }

  held(a: Action): boolean {
    return this.current.has(a);
  }

  pressed(a: Action): boolean {
    return this.current.has(a) && !this.previous.has(a);
  }

  repeat(a: Action): boolean {
    return this.repeated.has(a);
  }

  /** Swallows all current presses so the next scene doesn't react to the key that opened it. */
  consume(): void {
    this.current.forEach((a) => this.previous.add(a));
    this.repeated.clear();
  }

  /** The currently held direction (first match), or null. */
  direction(): 'up' | 'down' | 'left' | 'right' | null {
    for (const d of ['up', 'down', 'left', 'right'] as const) if (this.current.has(d)) return d;
    return null;
  }

  private pollGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      let anyPress = false;
      pad.buttons.forEach((b, i) => {
        const action = PAD_BINDINGS[i];
        if (action && b.pressed) {
          this.current.add(action);
          if (!this.previous.has(action)) anyPress = true;
        }
      });
      const [ax = 0, ay = 0] = pad.axes;
      if (ax < -STICK_DEADZONE) this.current.add('left');
      if (ax > STICK_DEADZONE) this.current.add('right');
      if (ay < -STICK_DEADZONE) this.current.add('up');
      if (ay > STICK_DEADZONE) this.current.add('down');
      if (anyPress) this.anyPressListeners.forEach((fn) => fn());
    }
  }
}
