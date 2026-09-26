/**
 * Monster battle sprites, generated procedurally and cached.
 *
 * Every monster faces RIGHT (enemies stand on the left of the battle screen).
 * Each sprite's canvas is its natural size and the bottom row is the ground
 * contact line; flying monsters leave empty rows beneath them.
 */
import { drawGolem, drawWolf } from './enemy-art/beasts';
import { drawBat, drawHornRabbit, drawJelly, drawSporecap, drawWisp, JELLY_GREEN, JELLY_RED } from './enemy-art/critters';
import { drawGoblin, drawSkeleton, drawTroll } from './enemy-art/humanoids';
import { drawWyrm } from './enemy-art/wyrm';
import { Painter } from './paint/painter';

export type EnemyArtId =
  | 'jelly' //       green gelatinous blob (32x32)
  | 'jelly_red' //   fiery palette swap of jelly (32x32)
  | 'hornrabbit' //  feral one-horned rabbit (32x32)
  | 'goblin' //      club-and-dagger raider in rags (48x48)
  | 'wolf' //        snarling grey-blue forest wolf (48x48)
  | 'sporecap' //    walking toadstool (32x32)
  | 'bat' //         purple cave bat, hovering (32x32)
  | 'skeleton' //    rusty-armoured skeleton warrior (48x48)
  | 'golem' //       mossy boulder golem with molten cracks (64x64)
  | 'wisp' //        pale-blue ghostly flame, hovering (32x32)
  | 'troll' //       mini-boss cave troll with a spiked club (64x64)
  | 'wyrm'; //       FINAL BOSS, the Umbral Wyrm (112x96)

interface EnemyArtDef {
  /** Canvas size in pixels. */
  w: number;
  h: number;
  /** Paints the monster back-to-front into a Painter of that size. */
  draw: (p: Painter) => void;
}

const DEFS: Record<EnemyArtId, EnemyArtDef> = {
  jelly: { w: 32, h: 32, draw: (p) => drawJelly(p, JELLY_GREEN) },
  jelly_red: { w: 32, h: 32, draw: (p) => drawJelly(p, JELLY_RED) },
  hornrabbit: { w: 32, h: 32, draw: drawHornRabbit },
  goblin: { w: 48, h: 48, draw: drawGoblin },
  wolf: { w: 48, h: 48, draw: drawWolf },
  sporecap: { w: 32, h: 32, draw: drawSporecap },
  bat: { w: 32, h: 32, draw: drawBat },
  skeleton: { w: 48, h: 48, draw: drawSkeleton },
  golem: { w: 64, h: 64, draw: drawGolem },
  wisp: { w: 32, h: 32, draw: drawWisp },
  troll: { w: 64, h: 64, draw: drawTroll },
  wyrm: { w: 112, h: 96, draw: drawWyrm },
};

export const ENEMY_ART_IDS: readonly EnemyArtId[] = Object.keys(DEFS) as EnemyArtId[];

const cache = new Map<EnemyArtId, HTMLCanvasElement>();

/** Returns the sprite canvas (cached). Canvas size is the sprite's natural size; the bottom row is the ground contact line. */
export function getEnemySprite(id: EnemyArtId): HTMLCanvasElement {
  let canvas = cache.get(id);
  if (!canvas) {
    const def = DEFS[id];
    const p = new Painter(def.w, def.h);
    def.draw(p);
    canvas = p.toCanvas();
    cache.set(id, canvas);
  }
  return canvas;
}
