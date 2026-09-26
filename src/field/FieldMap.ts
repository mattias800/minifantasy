import type { MapDef } from '../data/maps';
import { TILE_PROPS, type TileProps } from '../data/tileProps';
import { SCREEN_H, SCREEN_W, TILE } from '../engine/constants';
import { drawTile, type TileId, type TileNeighborhood } from '../gfx/tiles';

/** Runtime form of a MapDef: a parsed tile grid plus rendering. */
export class FieldMap {
  readonly width: number;
  readonly height: number;
  private readonly tiles: TileId[][];

  constructor(readonly def: MapDef) {
    this.height = def.rows.length;
    this.width = def.rows[0].length;
    this.tiles = def.rows.map((row, y) => {
      if (row.length !== this.width) throw new Error(`Map ${def.id}: row ${y} has length ${row.length}, expected ${this.width}`);
      return [...row].map((ch, x) => {
        const id = def.legend[ch];
        if (!id) throw new Error(`Map ${def.id}: unknown tile "${ch}" at ${x},${y}`);
        return id;
      });
    });
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Tile at a position; out-of-bounds positions return the nearest edge tile. */
  tileAt(x: number, y: number): TileId {
    const cx = Math.max(0, Math.min(this.width - 1, x));
    const cy = Math.max(0, Math.min(this.height - 1, y));
    return this.tiles[cy][cx];
  }

  props(x: number, y: number): TileProps {
    return TILE_PROPS[this.tileAt(x, y)];
  }

  /**
   * Camera top-left in pixels for a focus point, clamped to the map.
   * Maps smaller than the screen are centred.
   */
  cameraFor(focusX: number, focusY: number): { x: number; y: number } {
    const axis = (focus: number, mapPx: number, screen: number) =>
      mapPx <= screen ? -Math.floor((screen - mapPx) / 2) : Math.max(0, Math.min(mapPx - screen, Math.round(focus - screen / 2)));
    return {
      x: axis(focusX + TILE / 2, this.width * TILE, SCREEN_W),
      y: axis(focusY + TILE / 2, this.height * TILE, SCREEN_H),
    };
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number): void {
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(this.width - 1, Math.floor((camX + SCREEN_W - 1) / TILE));
    const y1 = Math.min(this.height - 1, Math.floor((camY + SCREEN_H - 1) / TILE));
    const nb = new Neighborhood(this);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        nb.cx = x;
        nb.cy = y;
        drawTile(ctx, this.tiles[y][x], x * TILE - camX, y * TILE - camY, x, y, nb, time);
      }
    }
  }
}

/** Reusable neighbourhood view, re-pointed at each tile while rendering. */
class Neighborhood implements TileNeighborhood {
  cx = 0;
  cy = 0;
  constructor(private readonly map: FieldMap) {}
  at(dx: number, dy: number): TileId {
    return this.map.tileAt(this.cx + dx, this.cy + dy);
  }
}
