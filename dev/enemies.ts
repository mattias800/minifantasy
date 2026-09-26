/**
 * Dev preview for monster sprites and battle backgrounds.
 *
 * Query params:
 *   only=enemies|backgrounds|battle   show a single section (default: all)
 *   scale=N                           CSS upscale factor (default: enemies 2, backgrounds 1, battle 2)
 *   ids=jelly,wolf                    restrict the enemies shown (and used in the battle mock)
 *   bg=cave                           background for the battle mock (default plains)
 */
import { ENEMY_ART_IDS, getEnemySprite, type EnemyArtId } from '../src/gfx/enemies';
import { getBattleBackground, type BattleBackgroundId } from '../src/gfx/backgrounds';

const BACKGROUNDS: BattleBackgroundId[] = ['plains', 'forest', 'cave', 'lair'];

const params = new URLSearchParams(location.search);
const only = params.get('only');
const scaleParam = params.get('scale');
const ids = (params.get('ids')?.split(',') as EnemyArtId[] | undefined) ?? [...ENEMY_ART_IDS];
const app = document.getElementById('app')!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  parent.appendChild(e);
  return e;
}

/** Copies a canvas and upscales it via CSS (nearest-neighbour). */
function scaled(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  c.style.width = `${src.width * scale}px`;
  c.style.height = `${src.height * scale}px`;
  return c;
}

function section(title: string): HTMLElement {
  el('h2', app, title);
  const grid = el('div', app);
  grid.className = 'grid';
  return grid;
}

function showEnemies(scale: number): void {
  const grid = section('Enemies (1x + upscaled)');
  for (const id of ids) {
    const sprite = getEnemySprite(id);
    const card = el('div', grid);
    card.className = 'card';
    el('div', card, `${id} ${sprite.width}x${sprite.height}`);
    const row = el('div', card);
    row.className = 'row';
    row.appendChild(scaled(sprite, 1));
    row.appendChild(scaled(sprite, scale));
  }
}

function showBackgrounds(scale: number): void {
  const grid = section('Battle backgrounds');
  for (const id of BACKGROUNDS) {
    const card = el('div', grid);
    card.className = 'card';
    el('div', card, id);
    card.appendChild(scaled(getBattleBackground(id), scale));
  }
}

/** A background with up to three enemies on the left half and a mock menu window, to judge scale. */
function showBattle(scale: number): void {
  const grid = section('Mock battle');
  const bg = (params.get('bg') as BattleBackgroundId | null) ?? 'plains';
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 224;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(getBattleBackground(bg), 0, 0);

  const party = params.get('ids') ? ids.slice(0, 3) : (['wolf', 'goblin', 'jelly'] as EnemyArtId[]);
  // Staggered formation: feet lines between y=112 and y=150, all within x < 128.
  const slots: [number, number][] = party.length === 1 ? [[64, 146]] : [[34, 118], [84, 134], [40, 152]];
  party.forEach((id, i) => {
    const s = getEnemySprite(id);
    const [cx, footY] = slots[i];
    ctx.drawImage(s, Math.round(cx - s.width / 2), footY - s.height);
  });
  // Party placeholders on the right and the menu window at the bottom.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 3; i++) ctx.fillRect(196 + i * 8, 100 + i * 20, 16, 24);
  ctx.fillStyle = '#1a2a8a';
  ctx.fillRect(4, 156, 248, 64);
  ctx.strokeStyle = '#e0e0f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 157, 246, 62);
  grid.appendChild(scaled(c, scale));
}

if (!only || only === 'enemies') showEnemies(Number(scaleParam ?? 2));
if (!only || only === 'backgrounds') showBackgrounds(Number(scaleParam ?? 1));
if (!only || only === 'battle') showBattle(Number(scaleParam ?? 2));
