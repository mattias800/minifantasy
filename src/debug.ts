/**
 * Development shortcuts, enabled only in `vite dev` builds via URL parameters:
 *
 *   ?start=town,14,18        skip the title/intro and start on a map at x,y
 *   ?level=8                 set the whole party to a level
 *   ?items=potion:5,ether:2  add items
 *   ?gold=1000               set gold
 *   ?flags=troll_defeated    set story flags (comma separated)
 *   ?battle=troll&bg=cave    jump straight into a battle (optionally &boss=1)
 *   ?scene=ending|gameover   show a specific scene
 */
import { BattleScene } from './battle/BattleScene';
import type { EnemyId } from './data/enemies';
import type { ItemId } from './data/items';
import type { MapId } from './data/maps';
import { xpForLevel } from './data/party';
import type { Game } from './engine/Game';
import { FieldScene } from './field/FieldScene';
import { GameState } from './game/GameState';
import type { BattleBackgroundId } from './gfx/backgrounds';
import { EndingScene } from './scenes/EndingScene';
import { GameOverScene } from './scenes/GameOverScene';

/** Returns true if a debug scene was started (the caller then skips the title). */
export function startDebugScene(game: Game): boolean {
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(location.search);
  const keys = ['start', 'battle', 'scene'];
  if (!keys.some((k) => params.has(k))) return false;

  const state = GameState.newGame();
  state.setFlag('intro_done');
  state.setFlag('seal_broken');
  const level = Number(params.get('level') ?? 1);
  for (const m of state.party) {
    m.gainXp(xpForLevel(level));
    m.restoreAll();
  }
  for (const pair of (params.get('items') ?? '').split(',').filter(Boolean)) {
    const [id, qty] = pair.split(':');
    state.inventory.add(id as ItemId, Number(qty ?? 1));
  }
  if (params.has('gold')) state.gold = Number(params.get('gold'));
  for (const f of (params.get('flags') ?? '').split(',').filter(Boolean)) state.setFlag(f);

  const start = params.get('start');
  if (start) {
    const [map, x, y] = start.split(',');
    state.location = { map: map as MapId, x: Number(x), y: Number(y), facing: 'down' };
  }

  const scene = params.get('scene');
  const battle = params.get('battle');
  if (scene === 'ending') game.push(new EndingScene(state));
  else if (scene === 'gameover') game.push(new GameOverScene());
  else if (battle) {
    const bg = (params.get('bg') ?? 'plains') as BattleBackgroundId;
    game.push(new BattleScene(state, battle.split(',') as EnemyId[], bg, { boss: params.has('boss') }));
  } else game.push(new FieldScene(state));
  return true;
}
