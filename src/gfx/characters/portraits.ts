/** 24x24 face portraits of the party for menus (status screen, formation). */
import { spriteFromRows } from '../pixelart';
import * as P from './palettes';
import type { PartyMemberId } from './types';

type Rows = readonly string[];

const HERO: Rows = [
  '.........o...o..........',
  '........oho.oho.o.......',
  '.......ohhhohhhoho......',
  '.....oohhhhhhhhhhhho....',
  '....ohhhhhhhhhhhhhhhHo..',
  '...ohhhhhhhhhhhhhhhHHHo.',
  '..ohhhhHhhhhhhhhhhHHHko.',
  '.ohhhHhhhhHhhhhhhHhHHko.',
  '.ohhHhhhhHhhhhhHhhhHHkko',
  '.ohHhHhhHhhhHhhhHhHHkko.',
  '..ohHHhsHssHsssHssHHko..',
  '..ohHskkksssssskkkSHko..',
  '..ohHseeesssssseeeSHko..',
  '..okHsewAssssssewASHko..',
  '..okhseAAsssssseAASkko..',
  '...ohssssssSssssSSSko...',
  '...osssssssSssssSSSo....',
  '....osssssssSSsssSSo....',
  '.....ossssssssSSo.......',
  '......oossssSSoo........',
  '...ooorrrossSorrroo.....',
  '..ommorrrrrrrrrrrRRoMo..',
  '.ommmMorrrrrrrrrRRRoMNo.',
  'ommmMMNoaaaAArAAnnoMNNNo',
];

const CLERIC: Rows = [
  '.........oooooo.........',
  '.......oohhhhhhoo.......',
  '......ohhhhhhhhhHo......',
  '.....ohhhhhhhhhhhHo.....',
  '....ohhhhhhhhhhhhhHo....',
  '...ohhhhhhhhhhhhhhHHo...',
  '...oyyyyyyygGyyyyyYYo...',
  '..ohhhHhhhhhhhhhhhHHko..',
  '..ohhHhsshhHsshHhsHHko..',
  '..ohhHssssssssssssHHko..',
  '..ohHskkksssssskkkSHko..',
  '..ohHseeesssssseeeSHko..',
  '..ohHsewcssssssewcSHko..',
  '..ohHseccsssssseccSHko..',
  '..ohHsssssssSssssSSHko..',
  '..ohHSsssssssssssSSHko..',
  '..ohHssssssSSssssSSHko..',
  '..ohHhossssssssSSohHko..',
  '..ohHhHossssSSSSoHhHko..',
  '..ohHhHHooSSSSooHHhHko..',
  '.ohHhHoaaacccccaaaoHhHko',
  'ohHhHoaaaaacGcaaaaAoHhko',
  'oHhoaaaaaaacccaaaaAAAnko',
  'oaaaaaaaaaacccaaaaaAAAno',
];

const MAGE: Rows = [
  '..............oo........',
  '.............ohko.......',
  '............ohhko.......',
  '...........ohhHko.......',
  '..........ohhhHko.......',
  '.........ohhhhHHko......',
  '........ohhhhhHHko......',
  '.......ohhhhhhHHHko.....',
  '......ohhhhhhhHHHko.....',
  '.....ohhhhhhhhhHHHko....',
  '....oyyyyyyyyyyYYYYYo...',
  'oohhhhhhhhhhhhhhhhHHHkoo',
  '.okkkkkkkkkkkkkkkkkkkko.',
  '...oxxxxxxxxxxxxxxxxo...',
  '...oxxxzzxxxxxxzzxxxo...',
  '...oxxxzzxxxxxxzzxxxo...',
  '...oxxxxxxxxxxxxxxxxo...',
  '...orrrrrrrrrrrrRRRRo...',
  '..orrrrrrrrrrrrRRRRRRo..',
  '..orrrrrrrrrrRRRRRRRRo..',
  '.oaaoorrrrrrRRRRRooAAno.',
  'oaaaaaoorrrRRRooAAAAAnno',
  'oaaaaaaaoorRRooAAAAAAnno',
  'oaaayaaaaaaoAAAAAAAyAnno',
];

const PORTRAITS: Record<PartyMemberId, { rows: Rows; palette: typeof P.HERO }> = {
  hero: { rows: HERO, palette: P.HERO },
  cleric: { rows: CLERIC, palette: P.CLERIC },
  mage: { rows: MAGE, palette: P.MAGE },
};

const cache = new Map<PartyMemberId, HTMLCanvasElement>();

export function getPortrait(id: PartyMemberId): HTMLCanvasElement {
  let portrait = cache.get(id);
  if (!portrait) {
    portrait = spriteFromRows(PORTRAITS[id].rows, PORTRAITS[id].palette);
    cache.set(id, portrait);
  }
  return portrait;
}
