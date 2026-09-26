import { audio } from '../audio/Audio';
import { isEquipment, item, type ItemId } from '../data/items';
import { SHOPS, type ShopDef, type ShopId } from '../data/shops';
import { SCREEN_H, SCREEN_W } from '../engine/constants';
import { drawText, drawTextRight } from '../engine/font';
import { clamp } from '../engine/math';
import { Scene } from '../engine/Scene';
import type { GameState } from '../game/GameState';
import { MAX_STACK } from '../game/Inventory';
import { COLOR_BAD, COLOR_DISABLED, COLOR_GOOD, COLOR_HIGHLIGHT, COLOR_LABEL, COLOR_TEXT } from '../ui/colors';
import { Menu } from '../ui/Menu';
import { drawWindow } from '../ui/Window';

type Mode = 'command' | 'buy' | 'sell' | 'qty';

const sellPrice = (id: ItemId) => Math.floor(item(id).price / 2);

export class ShopScene extends Scene {
  private readonly shop: ShopDef;
  private mode: Mode = 'command';
  private readonly commands = new Menu([{ label: 'Buy' }, { label: 'Sell' }, { label: 'Exit' }], {
    x: 30,
    y: 29,
    width: 210,
    rows: 1,
    columns: 3,
    columnWidth: 72,
  });
  private readonly list = new Menu([], { x: 22, y: 54, width: 128, rows: 12 });
  private listIds: ItemId[] = [];
  private qty = 1;
  private qtyFor: 'buy' | 'sell' = 'buy';
  private notice: string | null = null;

  constructor(
    private readonly state: GameState,
    shopId: ShopId,
  ) {
    super();
    this.shop = SHOPS[shopId];
  }

  private get selectedId(): ItemId | undefined {
    return this.listIds[this.list.index];
  }

  update(): void {
    const input = this.game.input;
    switch (this.mode) {
      case 'command': {
        const ev = this.commands.update(input);
        if (ev === 'cancel' || (ev === 'select' && this.commands.index === 2)) return this.finish();
        if (ev === 'select') this.commands.index === 0 ? this.openBuy() : this.openSell();
        return;
      }
      case 'buy':
      case 'sell': {
        const listMode = this.mode;
        const ev = this.list.update(input);
        this.notice = null;
        if (ev === 'cancel') this.mode = 'command';
        if (ev === 'select' && this.selectedId) {
          this.qtyFor = listMode;
          this.qty = 1;
          this.mode = 'qty';
        }
        return;
      }
      case 'qty':
        return this.updateQty();
    }
  }

  private openBuy(): void {
    this.listIds = [...this.shop.stock];
    this.refreshBuyList();
    this.list.index = 0;
    this.mode = 'buy';
  }

  private refreshBuyList(): void {
    this.list.setItems(this.listIds.map((id) => ({ label: item(id).name, right: String(item(id).price), enabled: item(id).price <= this.state.gold })));
  }

  private openSell(): void {
    this.refreshSellList();
    this.list.index = 0;
    this.mode = 'sell';
  }

  private refreshSellList(): void {
    const entries = this.state.inventory.entries().filter((e) => item(e.id).kind !== 'key' && item(e.id).price > 0);
    this.listIds = entries.map((e) => e.id);
    this.list.setItems(entries.map((e) => ({ label: item(e.id).name, right: String(sellPrice(e.id)) })));
  }

  private maxQty(): number {
    const id = this.selectedId!;
    if (this.qtyFor === 'sell') return this.state.inventory.count(id);
    const affordable = Math.floor(this.state.gold / Math.max(1, item(id).price));
    return Math.max(1, Math.min(affordable, MAX_STACK - this.state.inventory.count(id)));
  }

  private updateQty(): void {
    const input = this.game.input;
    const before = this.qty;
    const max = this.maxQty();
    if (input.repeat('right')) this.qty++;
    if (input.repeat('left')) this.qty--;
    if (input.repeat('up')) this.qty += 10;
    if (input.repeat('down')) this.qty -= 10;
    this.qty = clamp(this.qty, 1, max);
    if (this.qty !== before) audio.playSfx('cursor');

    if (input.pressed('cancel')) {
      audio.playSfx('cancel');
      this.mode = this.qtyFor;
      return;
    }
    if (!input.pressed('confirm')) return;
    const id = this.selectedId!;
    if (this.qtyFor === 'buy') {
      const cost = item(id).price * this.qty;
      if (cost > this.state.gold || this.state.inventory.count(id) + this.qty > MAX_STACK) {
        audio.playSfx('buzzer');
        this.notice = "You can't afford that.";
        this.mode = 'buy';
        return;
      }
      this.state.gold -= cost;
      this.state.inventory.add(id, this.qty);
      audio.playSfx('chest');
      this.notice = 'Thank you kindly!';
      this.refreshBuyList();
      this.mode = 'buy';
    } else {
      this.state.inventory.remove(id, this.qty);
      this.state.gold += sellPrice(id) * this.qty;
      audio.playSfx('chest');
      this.notice = 'A pleasure doing business.';
      this.refreshSellList();
      this.mode = this.listIds.length ? 'sell' : 'command';
    }
  }

  // ------------------------------------------------------------------ render

  render(ctx: CanvasRenderingContext2D): void {
    const t = this.game.time;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    drawWindow(ctx, 0, 0, SCREEN_W, 24);
    const id = this.mode === 'command' ? undefined : this.selectedId;
    const top = this.notice ?? (id ? item(id).description : this.shop.greeting);
    drawText(ctx, top, 8, 6);

    drawWindow(ctx, 0, 24, SCREEN_W, 22);
    this.commands.render(ctx, t, this.mode === 'command');

    drawWindow(ctx, 0, 46, 160, SCREEN_H - 46);
    if (this.mode === 'command') {
      drawText(ctx, this.shop.name, 16, 56, { color: COLOR_HIGHLIGHT });
    } else {
      this.list.render(ctx, t, this.mode !== 'qty');
      if (this.mode === 'sell' && this.listIds.length === 0) drawText(ctx, 'Nothing to sell.', 22, 54, { color: COLOR_DISABLED });
    }

    drawWindow(ctx, 160, 46, 96, 118);
    if (id) this.renderItemInfo(ctx, id);

    drawWindow(ctx, 160, 164, 96, 60);
    drawText(ctx, 'Gold', 170, 172, { color: COLOR_LABEL });
    drawTextRight(ctx, String(this.state.gold), 246, 186);

    if (this.mode === 'qty' && id) this.renderQty(ctx, id);
  }

  private renderItemInfo(ctx: CanvasRenderingContext2D, id: ItemId): void {
    const def = item(id);
    drawText(ctx, 'Owned', 168, 54, { color: COLOR_LABEL });
    drawTextRight(ctx, String(this.state.inventory.count(id)), 248, 54);
    if (!isEquipment(def)) return;
    // Who can use it, and how it compares to what they wear now.
    this.state.party.forEach((m, i) => {
      const y = 74 + i * 26;
      drawText(ctx, m.name, 168, y, { color: m.canEquip(id) ? COLOR_TEXT : COLOR_DISABLED });
      if (!m.canEquip(id)) {
        drawText(ctx, "can't equip", 176, y + 11, { color: COLOR_DISABLED });
        return;
      }
      const before = { atk: m.atk, def: m.def, mag: m.mag };
      const after = m.previewEquip(def.slot, id);
      const key = def.slot === 'weapon' ? (def.stats.atk && def.stats.atk >= (def.stats.mag ?? 0) ? 'atk' : 'mag') : 'def';
      const diff = after[key] - before[key];
      const label = key.toUpperCase();
      const color = diff > 0 ? COLOR_GOOD : diff < 0 ? COLOR_BAD : COLOR_TEXT;
      drawText(ctx, `${label} ${before[key]} ► ${after[key]}`, 176, y + 11, { color });
    });
  }

  private renderQty(ctx: CanvasRenderingContext2D, id: ItemId): void {
    const unit = this.qtyFor === 'buy' ? item(id).price : sellPrice(id);
    drawWindow(ctx, 20, 110, 128, 48);
    drawText(ctx, this.qtyFor === 'buy' ? 'Buy how many?' : 'Sell how many?', 30, 118, { color: COLOR_LABEL });
    drawText(ctx, `◄ ${this.qty} ►`, 30, 136);
    drawTextRight(ctx, `${unit * this.qty} G`, 138, 136, { color: COLOR_HIGHLIGHT });
  }
}
