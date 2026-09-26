import { audio } from '../audio/Audio';
import type { Input } from '../engine/Input';
import { drawText, drawTextRight, FONT_LINE_HEIGHT } from '../engine/font';
import { drawCursor } from './Window';
import { COLOR_DISABLED, COLOR_TEXT } from './colors';

export interface MenuItem {
  label: string;
  /** Right-aligned text (quantity, MP cost, price…). */
  right?: string;
  enabled?: boolean;
  color?: string;
}

export interface MenuOptions {
  x: number;
  y: number;
  width: number;
  /** Rows visible before scrolling. */
  rows: number;
  columns?: number;
  rowHeight?: number;
  /** Width of a column when `columns > 1` (defaults to width / columns). */
  columnWidth?: number;
}

export type MenuEvent = 'none' | 'move' | 'select' | 'cancel';

/**
 * A scrollable list (optionally multi-column) with the glove cursor.
 * Handles its own cursor sounds; callers react to the returned event.
 */
export class Menu {
  items: MenuItem[];
  index = 0;
  private scroll = 0;
  private readonly columns: number;
  private readonly rowHeight: number;
  private readonly columnWidth: number;

  constructor(items: MenuItem[], readonly opts: MenuOptions) {
    this.items = items;
    this.columns = opts.columns ?? 1;
    this.rowHeight = opts.rowHeight ?? FONT_LINE_HEIGHT + 1;
    this.columnWidth = opts.columnWidth ?? Math.floor(opts.width / this.columns);
  }

  get selected(): MenuItem | undefined {
    return this.items[this.index];
  }

  setItems(items: MenuItem[]): void {
    this.items = items;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    this.clampScroll();
  }

  /** Pixel height the menu occupies. */
  get height(): number {
    return this.opts.rows * this.rowHeight;
  }

  update(input: Input): MenuEvent {
    const n = this.items.length;
    if (input.pressed('cancel')) {
      audio.playSfx('cancel');
      return 'cancel';
    }
    if (n === 0) return 'none';
    if (input.pressed('confirm')) {
      if (this.selected?.enabled === false) {
        audio.playSfx('buzzer');
        return 'none';
      }
      audio.playSfx('confirm');
      return 'select';
    }
    const before = this.index;
    const cols = this.columns;
    if (input.repeat('down')) this.index = this.index + cols < n ? this.index + cols : this.index % cols;
    if (input.repeat('up')) {
      if (this.index - cols >= 0) this.index -= cols;
      else {
        // wrap to the last row in this column
        const col = this.index % cols;
        const lastRowStart = Math.floor((n - 1) / cols) * cols;
        this.index = Math.min(n - 1, lastRowStart + col);
      }
    }
    if (cols > 1) {
      if (input.repeat('right') && this.index + 1 < n) this.index++;
      if (input.repeat('left') && this.index > 0) this.index--;
    }
    if (this.index !== before) {
      audio.playSfx('cursor');
      this.clampScroll();
      return 'move';
    }
    return 'none';
  }

  private clampScroll(): void {
    const row = Math.floor(this.index / this.columns);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + this.opts.rows) this.scroll = row - this.opts.rows + 1;
  }

  /** Top-left position of an item's text. */
  itemPosition(i: number): { x: number; y: number } {
    const row = Math.floor(i / this.columns) - this.scroll;
    const col = i % this.columns;
    return { x: this.opts.x + col * this.columnWidth, y: this.opts.y + row * this.rowHeight };
  }

  /**
   * @param active  whether the cursor is shown animated (focused) or frozen (parent of a submenu)
   * @param showCursor  hide the cursor entirely (e.g. menu displayed but not focused)
   */
  render(ctx: CanvasRenderingContext2D, time: number, active = true, showCursor = true): void {
    const { rows } = this.opts;
    const first = this.scroll * this.columns;
    const last = Math.min(this.items.length, first + rows * this.columns);
    for (let i = first; i < last; i++) {
      const it = this.items[i];
      const { x, y } = this.itemPosition(i);
      const color = it.enabled === false ? COLOR_DISABLED : (it.color ?? COLOR_TEXT);
      drawText(ctx, it.label, x, y, { color });
      if (it.right !== undefined) {
        drawTextRight(ctx, it.right, x + this.columnWidth - (this.columns > 1 ? 6 : 0), y, { color });
      }
    }
    if (showCursor && this.items.length > 0) {
      const { x, y } = this.itemPosition(this.index);
      drawCursor(ctx, x - 2, y + Math.floor(FONT_LINE_HEIGHT / 2), time, active);
    }
    // scroll arrows
    const totalRows = Math.ceil(this.items.length / this.columns);
    const arrowX = this.opts.x + this.opts.width - 4;
    if (this.scroll > 0) drawText(ctx, '▲', arrowX, this.opts.y - 7, { color: COLOR_TEXT });
    if (this.scroll + rows < totalRows) drawText(ctx, '▼', arrowX, this.opts.y + rows * this.rowHeight - 5, { color: COLOR_TEXT });
  }
}
