/**
 * Tileset preview: every tile in a labelled grid plus a few animated sample maps.
 * Open /dev/tiles.html (all views) or /dev/tiles.html?view=grid|objects|overworld|town|interior|cave
 * for a single view scaled to fill a 768x672 window (handy for screenshots). Add &scale=N to zoom.
 */
import {
  ALL_TILE_IDS, drawTile, getFieldObjectSprite, type FieldObjectId, type TileId, type TileNeighborhood,
} from '../src/gfx/tiles';

type Placed = { id: FieldObjectId; x: number; y: number };

interface SampleMap {
  name: string;
  legend: Record<string, TileId>;
  rows: string[];
  objects?: Placed[];
}

const OVERWORLD: SampleMap = {
  name: 'overworld',
  legend: {
    '.': 'grass', ',': 'flowers', F: 'forest', h: 'hills', M: 'mountain', '~': 'water', s: 'sand', '=': 'path',
    B: 'bridge', T: 'town', C: 'cave_entrance',
  },
  rows: [
    'MMMMMhh....,..~~',
    'MMCMMh..FFF...s~',
    'MM=hh..FFFFF..s~',
    'Mh=...FFFFFFF.s~',
    'h.=..,.FFFFF..s~',
    '..=.....,.F..ss~',
    '~~B~~~~~~~~~~~~~',
    '~~B~~~~~~~~~~~~~',
    '..=..ss.~~..,...',
    '.,=.....~~..hh..',
    '..====T=BB====..',
    '.......,~~...hh.',
    'ss....s.~~s..ss~',
    '~~~~~~~~~~~~~~~~',
  ],
};

const TOWN: SampleMap = {
  name: 'town',
  legend: {
    '.': 'grass', ',': 'flowers', c: 'cobble', '=': 'path', R: 'roof', w: 'wall', o: 'window', D: 'door',
    I: 'wall_sign_inn', P: 'wall_sign_item', f: 'fence', t: 'tree', b: 'bush', W: 'well', L: 'lamp',
  },
  rows: [
    'tt.t..,==,.t.ttt',
    't.RRRRR.==RRRRR.',
    '..RRRRR.==RRRRR.',
    'b.RRRRR.==RRRRR.',
    '..woIDw.==wPoDw.',
    '.L.cccccccccccL.',
    '...cccccWccccc..',
    ',..cccccccccccb.',
    'ffff..cccc..ffff',
    '...f..c==c..f.,.',
    '.t.f...==...f.t.',
    '...f...==...f...',
    '.b.ffff==ffff.b.',
    't.,....==....,.t',
  ],
};

const INTERIOR: SampleMap = {
  name: 'interior',
  legend: {
    '#': 'int_wall', '.': 'floor', C: 'counter', B: 'bed', T: 'table', S: 'shelf', O: 'barrel', r: 'rug',
    H: 'hearth', m: 'mat', p: 'plant', ' ': 'void',
  },
  rows: [
    '################',
    '#SSS##H###SSS###',
    '#p....rrrr....p#',
    '#.T...rrrr..B.B#',
    '#.T...rrrr.....#',
    '#..............#',
    '#CCCCC.....T...#',
    '#....C..O......#',
    '#....C..OO.TT.p#',
    '#..............#',
    '#.....rrrr.....#',
    '#p....rrrr.....#',
    '#######m########',
    '                ',
  ],
  objects: [{ id: 'chest_closed', x: 13, y: 9 }, { id: 'chest_open', x: 1, y: 9 }],
};

const CAVE: SampleMap = {
  name: 'cave',
  legend: {
    '#': 'cave_wall', '.': 'cave_floor', o: 'rock', '<': 'stairs_up', '>': 'stairs_down', i: 'torch',
    '~': 'cave_water', A: 'altar', E: 'cave_mouth', B: 'bridge',
  },
  rows: [
    '################',
    '##i####..A..#i##',
    '#.............<#',
    '#..o...~~~.....#',
    '#.....~~~~~..o.#',
    '##....~~~~~....#',
    '#..o..BBBBB....#',
    '#.....~~~~~....#',
    '##.....~~~..o.##',
    '##............##',
    '#..o.......>...#',
    '##.....o......##',
    '###..........###',
    '#######EE#######',
  ],
  objects: [
    { id: 'heartstone_bright', x: 9, y: 1 },
    { id: 'save_crystal', x: 4, y: 10 },
    { id: 'chest_closed', x: 13, y: 3 },
    { id: 'chest_open', x: 12, y: 11 },
  ],
};

const MAPS = [OVERWORLD, TOWN, INTERIOR, CAVE];

// --- helpers ---------------------------------------------------------------------------------

function parseMap(m: SampleMap): TileId[][] {
  return m.rows.map((row, y) => {
    if (row.length !== 16) throw new Error(`${m.name} row ${y} has ${row.length} columns`);
    return [...row].map((ch) => {
      const id = m.legend[ch];
      if (!id) throw new Error(`${m.name}: no legend entry for '${ch}'`);
      return id;
    });
  });
}

/** Neighbourhood over a grid; out-of-bounds coordinates clamp to the nearest edge tile. */
function gridNeighborhood(grid: TileId[][], x: number, y: number): TileNeighborhood {
  const h = grid.length;
  const w = grid[0].length;
  return {
    at: (dx, dy) => grid[Math.min(h - 1, Math.max(0, y + dy))][Math.min(w - 1, Math.max(0, x + dx))],
  };
}

function makeCanvas(w: number, h: number, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.style.width = `${w * scale}px`;
  c.style.height = `${h * scale}px`;
  return c;
}

type Renderer = (time: number) => void;

function mapView(m: SampleMap, scale: number, parent: HTMLElement): Renderer {
  const grid = parseMap(m);
  const canvas = makeCanvas(256, 224, scale);
  parent.append(canvas);
  const ctx = canvas.getContext('2d')!;
  return (time) => {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        drawTile(ctx, grid[y][x], x * 16, y * 16, x, y, gridNeighborhood(grid, x, y), time);
      }
    }
    for (const o of m.objects ?? []) {
      const sprite = getFieldObjectSprite(o.id, time);
      ctx.drawImage(sprite, o.x * 16, (o.y + 1) * 16 - sprite.height);
    }
  };
}

// --- tile grid ---------------------------------------------------------------------------------

const INTERIOR_IDS = new Set<TileId>(['floor', 'int_wall', 'counter', 'bed', 'table', 'shelf', 'barrel', 'rug', 'hearth', 'mat', 'plant']);
const CAVE_IDS = new Set<TileId>(['cave_floor', 'cave_wall', 'rock', 'stairs_down', 'stairs_up', 'torch', 'cave_water', 'altar', 'cave_mouth']);

/** Shows each tile alone on its natural ground so autotile edges are visible. */
function isolatedNeighborhood(id: TileId): TileNeighborhood {
  const ground: TileId = INTERIOR_IDS.has(id) ? 'floor' : CAVE_IDS.has(id) ? 'cave_floor' : 'grass';
  return {
    at: (dx, dy) => {
      if (dx === 0 && dy === 0) return id;
      if (id === 'bridge') return dy === 0 ? 'water' : 'grass';
      return ground;
    },
  };
}

const CELL = 32;
const COLS = 8;
const OBJECTS: FieldObjectId[] = ['chest_closed', 'chest_open', 'save_crystal', 'heartstone_dim', 'heartstone_bright'];

function gridView(scale: number, parent: HTMLElement): Renderer {
  const rows = Math.ceil(ALL_TILE_IDS.length / COLS);
  const height = rows * CELL;
  const wrap = document.createElement('div');
  wrap.className = 'grid-wrap';
  const canvas = makeCanvas(256, height, scale);
  wrap.append(canvas);
  ALL_TILE_IDS.forEach((id, i) => {
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = id;
    label.style.left = `${((i % COLS) * CELL + 16) * scale}px`;
    label.style.top = `${(Math.floor(i / COLS) * CELL + 20) * scale}px`;
    label.style.fontSize = `${Math.max(8, scale * 3)}px`;
    wrap.append(label);
  });
  parent.append(wrap);
  const ctx = canvas.getContext('2d')!;
  return (time) => {
    ctx.fillStyle = '#0b0910';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ALL_TILE_IDS.forEach((id, i) => {
      const x = (i % COLS) * CELL + 8;
      const y = Math.floor(i / COLS) * CELL + 2;
      drawTile(ctx, id, x, y, i, 0, isolatedNeighborhood(id), time);
    });
  };
}

/** The field objects standing on a strip of cave floor. */
function objectsView(scale: number, parent: HTMLElement): Renderer {
  const canvas = makeCanvas(OBJECTS.length * 24 + 8, 40, scale);
  parent.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const floor = isolatedNeighborhood('cave_floor');
  return (time) => {
    for (let tx = 0; tx * 16 < canvas.width; tx++) {
      for (let ty = 0; ty < 3; ty++) drawTile(ctx, 'cave_floor', tx * 16, ty * 16, tx, ty, floor, time);
    }
    OBJECTS.forEach((id, i) => {
      const sprite = getFieldObjectSprite(id, time);
      ctx.drawImage(sprite, 8 + i * 24, 36 - sprite.height);
    });
  };
}

// --- boot ------------------------------------------------------------------------------------------

function boot(): void {
  const app = document.getElementById('app')!;
  const params = new URLSearchParams(location.search);
  const view = params.get('view') ?? 'all';
  const scale = Number(params.get('scale') ?? 3);
  const renderers: Renderer[] = [];
  if (view === 'all') {
    document.body.classList.add('all');
    const heading = (text: string) => {
      const h = document.createElement('h2');
      h.textContent = text;
      app.append(h);
    };
    heading('All tiles (isolated on their ground) + field objects');
    renderers.push(gridView(3, app), objectsView(3, app));
    heading('Sample maps');
    const maps = document.createElement('div');
    maps.className = 'maps';
    app.append(maps);
    for (const m of MAPS) renderers.push(mapView(m, 2, maps));
  } else if (view === 'grid') {
    renderers.push(gridView(scale, app), objectsView(scale, app));
  } else if (view === 'objects') {
    renderers.push(objectsView(scale, app));
  } else {
    const m = MAPS.find((mm) => mm.name === view);
    if (!m) throw new Error(`unknown view '${view}'`);
    renderers.push(mapView(m, scale, app));
  }
  const frame = (time: number) => {
    for (const r of renderers) r(time);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
