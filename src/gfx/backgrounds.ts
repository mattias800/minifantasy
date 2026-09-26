/**
 * Battle backdrops (256x224), generated procedurally and cached.
 *
 * Layout contract: scenery/horizon in the upper part, battlefield ground from
 * roughly y=90 down. The bottom ~70px sit under the menu windows, so the
 * interesting detail lives in the top ~155px.
 */
import { drawCave } from './bg-art/cave';
import { drawForest } from './bg-art/forest';
import { drawLair } from './bg-art/lair';
import { drawPlains } from './bg-art/plains';

export type BattleBackgroundId = 'plains' | 'forest' | 'cave' | 'lair';

const BUILDERS: Record<BattleBackgroundId, () => HTMLCanvasElement> = {
  plains: drawPlains,
  forest: drawForest,
  cave: drawCave,
  lair: drawLair,
};

const cache = new Map<BattleBackgroundId, HTMLCanvasElement>();

/** Full 256x224 background (cached). */
export function getBattleBackground(id: BattleBackgroundId): HTMLCanvasElement {
  let canvas = cache.get(id);
  if (!canvas) {
    canvas = BUILDERS[id]();
    cache.set(id, canvas);
  }
  return canvas;
}
