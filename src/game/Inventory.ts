import type { ItemId } from '../data/items';

export const MAX_STACK = 99;

/** Item counts, kept in acquisition order (like classic JRPG item lists). */
export class Inventory {
  private readonly counts = new Map<ItemId, number>();

  count(id: ItemId): number {
    return this.counts.get(id) ?? 0;
  }

  has(id: ItemId): boolean {
    return this.count(id) > 0;
  }

  /** Adds items (capped at MAX_STACK) and returns how many were actually added. */
  add(id: ItemId, qty = 1): number {
    const before = this.count(id);
    const after = Math.min(MAX_STACK, before + qty);
    this.counts.set(id, after);
    return after - before;
  }

  remove(id: ItemId, qty = 1): boolean {
    const before = this.count(id);
    if (before < qty) return false;
    if (before === qty) this.counts.delete(id);
    else this.counts.set(id, before - qty);
    return true;
  }

  entries(): Array<{ id: ItemId; qty: number }> {
    return [...this.counts].map(([id, qty]) => ({ id, qty }));
  }

  toSave(): Array<[ItemId, number]> {
    return [...this.counts];
  }

  static fromSave(data: Array<[ItemId, number]>): Inventory {
    const inv = new Inventory();
    for (const [id, qty] of data) inv.add(id, qty);
    return inv;
  }
}
