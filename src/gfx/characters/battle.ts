/**
 * 32x32 battle sprites for the party, facing left (enemies stand on the left).
 *
 * Every pose frame is composed from hand-drawn parts:
 *   legs (stance) -> torso -> head (with expression patch) -> weapon -> near arm -> effects
 * The near arm is a shared template (sleeve a/A/n, hand s/S) positioned by its
 * shoulder anchor; the weapon is drawn procedurally from the arm's hand anchor
 * along one of 8 directions, so one set of arms serves every weapon.
 * The KO pose is the standing figure rotated onto its back (see `layDown`).
 */
import { createCanvas, ctx2d, outline, spriteFromRows, type Palette } from '../pixelart';
import * as P from './palettes';
import type { BattlePose, PartyMemberId } from './types';

type Rows = readonly string[];
type Point = readonly [number, number];

const SIZE = 32;

// ---------------------------------------------------------------------------
// Directions & weapons
// ---------------------------------------------------------------------------

type Dir = 'up' | 'upLeft' | 'left' | 'downLeft' | 'down' | 'downRight' | 'right' | 'upRight';

const DIR_VECTORS: Record<Dir, Point> = {
  up: [0, -1],
  upLeft: [-1, -1],
  left: [-1, 0],
  downLeft: [-1, 1],
  down: [0, 1],
  downRight: [1, 1],
  right: [1, 0],
  upRight: [1, -1],
};

type WeaponKind = 'sword' | 'staff' | 'rod';

/** Decorative heads for the staff (gold ring around a floating gem) and the rod (crooked wood + gem). */
const STAFF_HEAD: Rows = [
  '..ooo..',
  '.oyyyo.',
  'oyggGYo',
  'oygGGYo',
  '.oYYYo.',
  '..oYo..',
];
const ROD_HEAD: Rows = [
  '.ooo..',
  'ogGGo.',
  'oGGGlo',
  '.oooLo',
  '...oLo',
];

/** Shaft length behind and in front of the hand, for staff-like weapons. */
const SHAFT: Record<Exclude<WeaponKind, 'sword'>, { back: number; front: number }> = {
  staff: { back: 6, front: 8 },
  rod: { back: 3, front: 6 },
};

/**
 * Draws a weapon held at hand position (hx, hy) pointing along `dir`.
 * Blade/shaft pixels are laid down first, then outlined as one shape so the
 * weapon reads cleanly against both the body and the background.
 */
function drawWeapon(ctx: CanvasRenderingContext2D, kind: WeaponKind, pal: Palette, hx: number, hy: number, dir: Dir): void {
  const layer = createCanvas(SIZE, SIZE);
  const c = ctx2d(layer);
  const [dx, dy] = DIR_VECTORS[dir];
  const px = (x: number, y: number, slot: string) => {
    c.fillStyle = pal[slot];
    c.fillRect(x, y, 1, 1);
  };
  // Second pixel column/row that gives blades their 2px thickness (shade side).
  const [tx, ty] = dy === 0 ? [0, 1] : [1, 0];

  if (kind === 'sword') {
    const len = dx !== 0 && dy !== 0 ? 8 : 10;
    px(hx - dx * 2, hy - dy * 2, 'Y'); // pommel
    px(hx - dx, hy - dy, 'L'); // grip
    px(hx, hy, 'L');
    // Cross-guard, perpendicular to the blade.
    const gx = hx + dx;
    const gy = hy + dy;
    for (const k of [-1, 0, 1]) px(gx - dy * k, gy + dx * k, k === -1 ? 'y' : 'Y');
    for (let i = 2; i <= len + 1; i++) {
      const x = hx + dx * i;
      const y = hy + dy * i;
      px(x, y, 'm');
      if (i <= len) px(x + tx, y + ty, 'M');
    }
    px(hx + dx * 2 + tx, hy + dy * 2 + ty, 'N'); // blade root shadow
  } else {
    // Shafts are gripped near the middle so they fit the canvas in every pose.
    const { back, front } = SHAFT[kind];
    for (let i = -back; i <= front; i++) px(hx + dx * i, hy + dy * i, i % 3 === 0 ? 'L' : 'l');
  }
  ctx.drawImage(outline(layer, P.OUTLINE), 0, 0);

  if (kind !== 'sword') {
    const head = spriteFromRows(kind === 'staff' ? STAFF_HEAD : ROD_HEAD, pal);
    const reach = SHAFT[kind].front + 2;
    const cx = hx + dx * reach;
    const cy = hy + dy * reach;
    ctx.drawImage(head, cx - Math.floor(head.width / 2), cy - Math.floor(head.height / 2));
  }
}

// ---------------------------------------------------------------------------
// Shared near-arm templates (sleeve a/A/n, hand s/S)
// ---------------------------------------------------------------------------

interface ArmDef {
  rows: Rows;
  /** Pixel of the grid that sits on the character's shoulder point. */
  shoulder: Point;
  /** Pixel where the hand grips (weapon origin / item position). */
  hand: Point;
}

type ArmPose = 'down' | 'forward' | 'up' | 'back' | 'reach' | 'guard';

const ARMS: Record<ArmPose, ArmDef> = {
  down: {
    rows: [
      '.ooo.',
      'oaAno',
      'oaAno',
      'oaAno',
      'oaAo.',
      'osSo.',
      'oSSo.',
      '.oo..',
    ],
    shoulder: [2, 1],
    hand: [1, 5],
  },
  forward: {
    rows: [
      '.ooooooo.',
      'osSaaaAAo',
      'oSSAAAnno',
      '.ooooooo.',
    ],
    shoulder: [7, 1],
    hand: [1, 1],
  },
  up: {
    rows: [
      '.oo..',
      'osSo.',
      'oSSo.',
      'oaAo.',
      'oaAno',
      'oaAno',
      '.oaAo',
      '..oo.',
    ],
    shoulder: [3, 6],
    hand: [1, 1],
  },
  back: {
    rows: [
      '...oo.',
      '..osSo',
      '..oSSo',
      '.oaAo.',
      'oaAno.',
      'oaAo..',
      '.oo...',
    ],
    shoulder: [1, 5],
    hand: [3, 1],
  },
  /** Stretched up and forward, e.g. holding out an item. */
  reach: {
    rows: [
      '.oo........',
      'osSoo......',
      'oSSaAoo....',
      '.ooaaAAoo..',
      '...ooaaAAno',
      '.....ooaAno',
      '.......ooo.',
    ],
    shoulder: [9, 4],
    hand: [1, 1],
  },
  guard: {
    rows: [
      '......oo',
      '.oooooAo',
      'osSaaAno',
      'oSSAAno.',
      '.ooooo..',
    ],
    shoulder: [6, 1],
    hand: [1, 2],
  },
};

// ---------------------------------------------------------------------------
// Pose frames
// ---------------------------------------------------------------------------

type Expression = 'normal' | 'wince' | 'ko';
type Stance = 'stand' | 'step' | 'lunge' | 'kneel';

interface Frame {
  legs: Stance;
  arm: ArmPose;
  /** Whole-body horizontal shift (negative = towards the enemy). */
  dx?: number;
  /** Upper-body drop (breathing, crouching, kneeling). */
  dy?: number;
  /** Extra head offset for leaning. */
  headDx?: number;
  headDy?: number;
  expression?: Expression;
  /** Weapon direction from the hand; omitted = weapon put away. */
  weapon?: Dir;
  item?: boolean;
  /** Sparkle drawn at an offset from the hand (cast/victory glints). */
  sparkle?: Point;
}

interface BattleCharDef {
  palette: Palette;
  weapon: WeaponKind;
  head: Rows;
  /** Replacement rows drawn over the head for expressions other than 'normal'. */
  expressions: Record<Exclude<Expression, 'normal'>, { at: Point; rows: Rows }>;
  torso: Rows;
  /** Stance grids, bottom-aligned at x = LEGS_X. */
  legs: Record<Stance, Rows>;
  /** Optional overlay drawn above the arm at the shoulder (e.g. a pauldron). */
  shoulderPiece?: { rows: Rows; anchor: Point };
  /** Palette overrides for the arm (e.g. darker sleeves that stand out against the robe). */
  armColors?: Palette;
  /**
   * KO pose: optional replacement head (same size as `head` so expression
   * patches still line up) and a prop drawn behind the body on the ground.
   */
  koHead?: Rows;
  koProp?: { rows: Rows; x: number };
  /** Top-left positions in the idle pose. */
  headPos: Point;
  torsoPos: Point;
  shoulder: Point;
  poses: Record<BattlePose, Frame[]>;
}

const LEGS_X = 8;

/**
 * Pose table shared by all three party members (they differ in parts, not timing).
 * `weakWeapon` is how the weapon is propped up while kneeling.
 */
function standardPoses(weakWeapon: Dir): Record<BattlePose, Frame[]> {
  const weaponIdle: Dir = 'upLeft';
  return {
    idle: [
      { legs: 'stand', arm: 'down', weapon: weaponIdle },
      { legs: 'stand', arm: 'down', weapon: weaponIdle, dy: 1 },
    ],
    walk: [
      { legs: 'step', arm: 'down', weapon: weaponIdle, dx: -1, dy: 1 },
      { legs: 'stand', arm: 'down', weapon: weaponIdle, dx: -2 },
    ],
    attack: [
      { legs: 'stand', arm: 'back', weapon: 'upRight', dx: 1, headDx: 1 },
      { legs: 'lunge', arm: 'forward', weapon: 'left', dx: -3, dy: 1, headDx: -1 },
    ],
    cast: [
      { legs: 'stand', arm: 'up', weapon: 'up', sparkle: [0, -12] },
      { legs: 'step', arm: 'forward', weapon: 'upLeft', dx: -1, dy: 1, sparkle: [-10, -10] },
    ],
    item: [{ legs: 'stand', arm: 'reach', item: true, dx: 1 }],
    defend: [{ legs: 'step', arm: 'guard', weapon: 'upLeft', dx: 1, dy: 1 }],
    hurt: [{ legs: 'stand', arm: 'down', weapon: 'downLeft', dx: 3, headDx: 1, expression: 'wince' }],
    weak: [{ legs: 'kneel', arm: 'guard', weapon: weakWeapon, dy: 5, headDx: -1, headDy: 1, expression: 'wince' }],
    // Composed standing, then rotated onto its back by `layDown`.
    dead: [{ legs: 'stand', arm: 'down', expression: 'ko' }],
    victory: [
      { legs: 'stand', arm: 'up', weapon: 'up', sparkle: [0, -12] },
      { legs: 'step', arm: 'up', weapon: 'upLeft', dy: 1, sparkle: [-9, -9] },
    ],
  };
}

// ---------------------------------------------------------------------------
// Kael (hero)
// ---------------------------------------------------------------------------

const HERO: BattleCharDef = {
  palette: P.HERO,
  weapon: 'sword',
  head: [
    '......o.oo....',
    '....oohohhoo..',
    '...ohhhhhhhhoo',
    '..ohhhhhhhhHHo',
    '.ohhhhhhhhHHko',
    '.ohHhhHhhhHkko',
    'ohHshHsshHHko.',
    'ossesssShHkko.',
    'ossessSkkkko..',
    '.osssSSokko...',
  ],
  expressions: {
    wince: { at: [1, 7], rows: ['sseS', 'sSeS'] },
    ko: { at: [1, 7], rows: ['ssss', 'seeS'] },
  },
  torso: [
    '....orrrrRo...',
    '...orrrrRRRooo',
    '..oammmrRRRRRo',
    '.oammmmmMNoRRo',
    '.oammmmMMNno.o',
    '.oaMmmMMNNnno.',
    '.oaaMMNNnAAno.',
    '.ollllyLLLLlo.',
    '.oaaaAAAAnnno.',
    '..oAAAAnnnno..',
  ],
  legs: {
    stand: [
      '....oAnnooAnno..',
      '....oAnnooAnno..',
      '...oAnno.oAnno..',
      '...oAno..oAnno..',
      '..olLLo..olLLo..',
      '..olLLo..olLLo..',
      '.olLLLo.olLLLo..',
      '.ooooo..ooooo...',
    ],
    step: [
      '....oAnnooAnno..',
      '...oAnnoooAnno..',
      '..oAnno..oAnno..',
      '.oAnno....oAnno.',
      '.olLLo....olLLo.',
      'olLLo......olLo.',
      'olLLLo.....olLLo',
      'oooooo.....ooooo',
    ],
    lunge: [
      '.....oAnnoAnno..',
      '....oAnnoooAnno.',
      '...oAnno...oAnno',
      '..oAnno.....oAno',
      '..olLLo.....olLo',
      '.olLLo......olLo',
      'olLLLo.....olLLo',
      'oooooo.....ooooo',
    ],
    kneel: [
      '....oAnnnnAno...',
      '...oAnnoAAnnno..',
      '...oAno.oAAnno..',
      '..olLo..oAnnno..',
      '.olLLo.oLLLLLLo.',
      'oooooo.oooooooo.',
    ],
  },
  shoulderPiece: {
    rows: ['.oooo.', 'ommMMo', 'omMMNo', 'oMMNNo', '.oNNo.', '..oo..'],
    anchor: [3, 2],
  },
  headPos: [9, 6],
  torsoPos: [9, 16],
  shoulder: [17, 19],
  poses: standardPoses('down'),
};

// ---------------------------------------------------------------------------
// Lyra (cleric)
// ---------------------------------------------------------------------------

const CLERIC: BattleCharDef = {
  palette: P.CLERIC,
  weapon: 'staff',
  head: [
    '.....oooo.....',
    '...oohhhhoo...',
    '..ohhhhhhhhoo.',
    '.ohhhhhhhhhhHo',
    '.ohhhhhhhhhHHo',
    'oyygyyYhhhHHko',
    'ohhshhshhHHHko',
    'ossesssShHHko.',
    'ossessShhHHko.',
    '.osssSohHHkko.',
    '......ohHHko..',
    '.....ohHHkko..',
    '.....okkkko...',
  ],
  expressions: {
    wince: { at: [1, 7], rows: ['sseS', 'sSeS'] },
    ko: { at: [1, 7], rows: ['ssss', 'seeS'] },
  },
  torso: [
    '....occcCo....',
    '...oaaccCAo...',
    '..oaaaacAAAo..',
    '.oaaaaacAAAno.',
    '.oaaaaacAAAno.',
    '.oaaaaacAAnno.',
    '.occcyccCCCCo.',
    '.oaaaaacAAAno.',
    '.oaaaaacAAAno.',
    '.oaaaaacAAAnno',
  ],
  legs: {
    stand: [
      '...oaaaacAAAno..',
      '...oaaaacAAAno..',
      '..oaaaaacAAAAno.',
      '..oaaaaacAAAAno.',
      '..oaaaaacAAAAno.',
      '.oaaaaaacAAAAAno',
      '.occcccccCCCCCCo',
      '.olLoooooooooo..',
    ],
    step: [
      '...oaaaacAAAno..',
      '..oaaaaacAAAno..',
      '..oaaaaacAAAAno.',
      '.oaaaaaacAAAAno.',
      '.oaaaaaacAAAAAno',
      'oaaaaaaacAAAAAno',
      'occcccccCCCCCCCo',
      'olLooooooooolLo.',
    ],
    lunge: [
      '...oaaaacAAAno..',
      '..oaaaaacAAAAno.',
      '.oaaaaaacAAAAno.',
      '.oaaaaaacAAAAAno',
      'oaaaaaaacAAAAAno',
      'oaaaaaaacAAAAAAo',
      'occcccccCCCCCCCo',
      'olLooooooooolLo.',
    ],
    kneel: [
      '....oaaacAAAno..',
      '...oaaaacAAAAno.',
      '..oaaaaacAAAAAno',
      '.oaaaaaacAAAAAAo',
      'occcccccCCCCCCCo',
      '.oooooooooooooo.',
    ],
  },
  headPos: [9, 6],
  torsoPos: [9, 16],
  shoulder: [17, 19],
  poses: standardPoses('upLeft'),
};

// ---------------------------------------------------------------------------
// Orrin (mage)
// ---------------------------------------------------------------------------

const MAGE_HAT: Rows = [
  '............oo....',
  '...........ohko...',
  '..........ohHko...',
  '.........ohhHo....',
  '........ohhhHko...',
  '.......ohhhhHko...',
  '......ohhhhhHHko..',
  '......ohhhhhHHko..',
  '.....oyyyyyyyYYYo.',
  'ohhhhhhhhhhhhhHHko',
  '.okkkkkkkkkkkkkkko',
];

/** The shadowed face and scarf below the brim. */
const MAGE_FACE: Rows = [
  '...oxxxxxxxkko....',
  '...oxzxxzxxkko....',
  '...orrrrrrRRRo....',
  '....orrrrRRRo.....',
];

const MAGE: BattleCharDef = {
  palette: P.MAGE,
  weapon: 'rod',
  head: [...MAGE_HAT, ...MAGE_FACE],
  expressions: {
    wince: { at: [4, 12], rows: ['zzxzz'] },
    ko: { at: [4, 12], rows: ['xxxxx'] },
  },
  torso: [
    '...orrrrRRoRRo',
    '..oaarrRRAoRRo',
    '.oaaaarRAAAoo.',
    '.oaaaaaRAAAno.',
    '.oaayaaAAAAno.',
    '.oaaaaaAAAnno.',
    '.oyyyyYYYYYYo.',
    '.oaaaaaAAAAno.',
    '.oaaayaAAAAno.',
    '.oaaaaaAAAAnno',
  ],
  legs: {
    stand: [
      '...oaaaaAAAAno..',
      '...oaaaaAAAAno..',
      '..oaayaaAAAAAno.',
      '..oaaaaaAAAyAno.',
      '..oaaaaaAAAAAno.',
      '.oaaaaaaAAAAAAno',
      '.oyyyyyyYYYYYYYo',
      '.olLoooooooooo..',
    ],
    step: [
      '...oaaaaAAAAno..',
      '..oaaaaaAAAAno..',
      '..oaayaaAAAAAno.',
      '.oaaaaaaAAAyAno.',
      '.oaaaaaaAAAAAAno',
      'oaaaaaaaAAAAAAno',
      'oyyyyyyyYYYYYYYo',
      'olLooooooooolLo.',
    ],
    lunge: [
      '...oaaaaAAAAno..',
      '..oaaaaaAAAAAno.',
      '.oaayaaaAAAAAno.',
      '.oaaaaaaAAAyAAno',
      'oaaaaaaaAAAAAAno',
      'oaaaaaaaAAAAAAAo',
      'oyyyyyyyYYYYYYYo',
      'olLooooooooolLo.',
    ],
    kneel: [
      '....oaaaaAAAno..',
      '...oaayaaAAAAno.',
      '..oaaaaaaAAAyAno',
      '.oaaaaaaaAAAAAAo',
      'oyyyyyyyyYYYYYYo',
      '.oooooooooooooo.',
    ],
  },
  headPos: [6, 2],
  torsoPos: [9, 16],
  shoulder: [17, 19],
  armColors: { a: P.MAGE.A, A: P.MAGE.n, n: P.MAGE.k },
  // Knocked out, Orrin loses his hat: it lands upright behind him.
  koHead: [...MAGE_HAT.map((row) => '.'.repeat(row.length)), ...MAGE_FACE],
  koProp: { rows: MAGE_HAT, x: 14 },
  poses: standardPoses('upLeft'),
};

const DEFS: Record<PartyMemberId, BattleCharDef> = {
  hero: HERO,
  cleric: CLERIC,
  mage: MAGE,
};

// ---------------------------------------------------------------------------
// Effects & props
// ---------------------------------------------------------------------------

const SPARKLE: Rows = [
  '...w...',
  '...g...',
  '..gwg..',
  'wgwwwgw',
  '..gwg..',
  '...g...',
  '...w...',
];

const POTION_PALETTE: Palette = { o: P.OUTLINE, l: '#a86c3c', L: '#6c4424', w: '#ffffff', W: '#c8e8f8', b: '#58d8f0', B: '#2890c8' };
const POTION: Rows = [
  '.ooo.',
  '.olo.',
  '.oWo.',
  'owbbo',
  'obbBo',
  'obBBo',
  '.ooo.',
];

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function composeFrame(def: BattleCharDef, f: Frame, head: Rows = def.head): HTMLCanvasElement {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = ctx2d(canvas);
  const pal = def.palette;
  const draw = (rows: Rows, x: number, y: number) => ctx.drawImage(spriteFromRows(rows, pal), x, y);
  const dx = f.dx ?? 0;
  const dy = f.dy ?? 0;

  const legs = def.legs[f.legs];
  draw(legs, LEGS_X + dx, SIZE - legs.length);
  draw(def.torso, def.torsoPos[0] + dx, def.torsoPos[1] + dy);

  const hx = def.headPos[0] + dx + (f.headDx ?? 0);
  const hy = def.headPos[1] + dy + (f.headDy ?? 0);
  if (head.length > 0) draw(head, hx, hy);
  const expression = f.expression ?? 'normal';
  if (expression !== 'normal' && head.length > 0) {
    const patch = def.expressions[expression];
    draw(patch.rows, hx + patch.at[0], hy + patch.at[1]);
  }

  const arm = ARMS[f.arm];
  const sx = def.shoulder[0] + dx;
  const sy = def.shoulder[1] + dy;
  const ax = sx - arm.shoulder[0];
  const ay = sy - arm.shoulder[1];
  const handX = ax + arm.hand[0];
  const handY = ay + arm.hand[1];
  if (f.weapon) drawWeapon(ctx, def.weapon, pal, handX, handY, f.weapon);
  ctx.drawImage(spriteFromRows(arm.rows, def.armColors ? { ...pal, ...def.armColors } : pal), ax, ay);
  if (def.shoulderPiece) {
    const sp = def.shoulderPiece;
    draw(sp.rows, sx - sp.anchor[0], sy - sp.anchor[1]);
  }
  if (f.item) ctx.drawImage(spriteFromRows(POTION, POTION_PALETTE), handX - 5, handY - 6);
  if (f.sparkle) draw(SPARKLE, handX + f.sparkle[0] - 3, handY + f.sparkle[1] - 3);
  return canvas;
}

/**
 * Turns a standing figure into a KO'd one lying on its back: rotated 90deg
 * clockwise (head to the right, face up), then placed on the bottom row and
 * centred horizontally (or starting at column `left` when given).
 */
function layDown(standing: HTMLCanvasElement, left?: number): HTMLCanvasElement {
  const rotated = createCanvas(SIZE, SIZE);
  const rctx = ctx2d(rotated);
  rctx.translate(SIZE, 0);
  rctx.rotate(Math.PI / 2);
  rctx.drawImage(standing, 0, 0);

  const data = rctx.getImageData(0, 0, SIZE, SIZE).data;
  let minX = SIZE;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (data[(y * SIZE + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const out = createCanvas(SIZE, SIZE);
  const shiftX = (left ?? Math.floor((SIZE - (maxX - minX + 1)) / 2)) - minX;
  ctx2d(out).drawImage(rotated, shiftX, SIZE - 1 - maxY);
  return out;
}

const FRAME_COUNTS: Record<BattlePose, number> = {
  idle: 2,
  walk: 2,
  attack: 2,
  cast: 2,
  item: 1,
  defend: 1,
  hurt: 1,
  weak: 1,
  dead: 1,
  victory: 2,
};

export function battlePoseFrameCount(pose: BattlePose): number {
  return FRAME_COUNTS[pose];
}

const cache = new Map<string, HTMLCanvasElement>();

export function getBattleSprite(id: PartyMemberId, pose: BattlePose, frame: number): HTMLCanvasElement {
  const count = FRAME_COUNTS[pose];
  const f = ((Math.floor(frame) % count) + count) % count;
  const key = `${id}/${pose}/${f}`;
  let sprite = cache.get(key);
  if (!sprite) {
    const def = DEFS[id];
    if (pose === 'dead') {
      const body = layDown(composeFrame(def, def.poses.dead[0], def.koHead), def.koProp ? 1 : undefined);
      if (def.koProp) {
        sprite = createCanvas(SIZE, SIZE);
        const ctx = ctx2d(sprite);
        const prop = spriteFromRows(def.koProp.rows, def.palette);
        ctx.drawImage(prop, def.koProp.x, SIZE - prop.height);
        ctx.drawImage(body, 0, 0);
      } else {
        sprite = body;
      }
    } else {
      sprite = composeFrame(def, def.poses[pose][f]);
    }
    cache.set(key, sprite);
  }
  return sprite;
}
