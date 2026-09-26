/**
 * Dev preview for character sprites: every field sprite (4 facings x 2 frames),
 * every battle pose/frame of the party on a grassy backdrop, and the portraits.
 *
 * Query params:
 *   view=all|field|battle|portrait   which section(s) to show (default all)
 *   zoom=N                           CSS upscale (default: largest that fits the window)
 */
import {
  FIELD_SPRITE_IDS,
  battlePoseFrameCount,
  getBattleSprite,
  getFieldSprite,
  getPortrait,
  type BattlePose,
  type Facing,
  type PartyMemberId,
} from '../src/gfx/characters';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'all';
/** Optional comma-separated filter of sprite ids, e.g. ids=hero,cat */
const idFilter = params.get('ids')?.split(',');
const keep = (id: string) => !idFilter || idFilter.includes(id);

const FACINGS: Facing[] = ['down', 'up', 'left', 'right'];
const PARTY = (['hero', 'cleric', 'mage'] as PartyMemberId[]).filter(keep);
const FIELD_IDS = FIELD_SPRITE_IDS.filter(keep);
const POSES: BattlePose[] = ['idle', 'walk', 'attack', 'cast', 'item', 'defend', 'hurt', 'weak', 'dead', 'victory'];

const LABEL_W = 40;
const FIELD_CELL = 18;
const BATTLE_CELL = 34;
const BATTLE_PER_ROW = 8;

/** All battle frames of one character as [pose, frame] pairs, in display order. */
const BATTLE_FRAMES: [BattlePose, number][] = POSES.flatMap((pose) =>
  Array.from({ length: battlePoseFrameCount(pose) }, (_, f) => [pose, f] as [BattlePose, number]),
);
const BATTLE_ROWS = Math.ceil(BATTLE_FRAMES.length / BATTLE_PER_ROW);
const BATTLE_CHAR_H = BATTLE_ROWS * (BATTLE_CELL + 7) + 4;

const fieldSize = { w: LABEL_W + FACINGS.length * 2 * FIELD_CELL, h: 10 + FIELD_IDS.length * FIELD_CELL };
const battleSize = { w: LABEL_W + BATTLE_PER_ROW * BATTLE_CELL, h: PARTY.length * BATTLE_CHAR_H };
const portraitSize = { w: LABEL_W + PARTY.length * 30, h: 36 };

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#e8e8f0'): void {
  ctx.fillStyle = color;
  ctx.font = '7px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

function drawField(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  FACINGS.forEach((f, i) => label(ctx, f, ox + LABEL_W + i * 2 * FIELD_CELL, oy));
  FIELD_IDS.forEach((id, row) => {
    const y = oy + 10 + row * FIELD_CELL;
    label(ctx, id, ox, y + 5);
    FACINGS.forEach((facing, i) => {
      for (const frame of [0, 1] as const) {
        const x = ox + LABEL_W + (i * 2 + frame) * FIELD_CELL;
        ctx.fillStyle = frame === 0 ? '#3c6c34' : '#46783c';
        ctx.fillRect(x, y, FIELD_CELL - 1, FIELD_CELL - 1);
        ctx.drawImage(getFieldSprite(id, facing, frame), x, y);
      }
    });
  });
}

function drawBattle(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  PARTY.forEach((id, c) => {
    const cy = oy + c * BATTLE_CHAR_H;
    label(ctx, id, ox, cy + 16);
    BATTLE_FRAMES.forEach(([pose, frame], i) => {
      const x = ox + LABEL_W + (i % BATTLE_PER_ROW) * BATTLE_CELL;
      const y = cy + Math.floor(i / BATTLE_PER_ROW) * (BATTLE_CELL + 7);
      label(ctx, `${pose}${battlePoseFrameCount(pose) > 1 ? frame : ''}`, x, y, '#b8c8b0');
      // Grassy battlefield backdrop with a darker ground band under the feet.
      ctx.fillStyle = '#5c8c40';
      ctx.fillRect(x, y + 7, 32, 32);
      ctx.fillStyle = '#4c7834';
      ctx.fillRect(x, y + 7 + 28, 32, 4);
      ctx.drawImage(getBattleSprite(id, pose, frame), x, y + 7);
    });
  });
}

function drawPortraits(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  label(ctx, 'portrait', ox, oy + 10);
  PARTY.forEach((id, i) => {
    const x = ox + LABEL_W + i * 30;
    ctx.fillStyle = '#283c8c';
    ctx.fillRect(x - 2, oy, 28, 28);
    ctx.drawImage(getPortrait(id), x, oy + 2);
  });
}

// Layout: field sheet on the left, battle + portraits on the right.
const showField = view === 'all' || view === 'field';
const showBattle = view === 'all' || view === 'battle';
const showPortrait = view === 'all' || view === 'portrait';
const rightX = showField ? fieldSize.w + 8 : 0;
const width = Math.max(showField ? fieldSize.w : 0, rightX + Math.max(showBattle ? battleSize.w : 0, showPortrait ? portraitSize.w : 0));
const height = Math.max(showField ? fieldSize.h : 0, (showBattle ? battleSize.h : 0) + (showPortrait ? portraitSize.h : 0)) + 4;

const canvas = document.getElementById('sheet') as HTMLCanvasElement;
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
if (showField) drawField(ctx, 2, 2);
if (showBattle) drawBattle(ctx, rightX + 2, 2);
if (showPortrait) drawPortraits(ctx, rightX + 2, (showBattle ? battleSize.h : 0) + 2);

const fit = Math.max(1, Math.floor(Math.min(innerWidth / width, innerHeight / height) * 4) / 4);
const zoom = Number(params.get('zoom') ?? fit);
canvas.style.width = `${width * zoom}px`;
canvas.style.height = `${height * zoom}px`;
