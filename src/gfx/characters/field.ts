/**
 * 16x16 field (map) sprites in FF4/FF5-style chibi proportions.
 *
 * Each view (down / up / left) of a character is built from two layers:
 *  - `body`: bottom-aligned rows (shoulders, torso, legs). `step` replaces the
 *    last rows of the body for walk frame 1, so only the legs need redrawing.
 *    Common bodies (tunic, dress, robe) are shared templates recoloured by
 *    each character's palette.
 *  - `head`: top-aligned rows drawn over the body (hair, face, hats, beards,
 *    and held props such as a cane or spear, which may reach the bottom row).
 * The right-facing view is the left view mirrored.
 */
import { createCanvas, ctx2d, flipX, outline, spriteFromRows, type Palette } from '../pixelart';
import * as P from './palettes';
import type { Facing, FieldSpriteId } from './types';

type Rows = readonly string[];

interface BodyDef {
  rows: Rows;
  /** Replacement for the last `step.length` rows in walk frame 1. */
  step: Rows;
}

interface ViewDef {
  head: Rows;
  body: BodyDef;
}

type View = 'down' | 'up' | 'left';
type Views<T> = Record<View, T>;

interface FieldCharDef extends Views<ViewDef> {
  palette: Palette;
  /** Optional post-processing of each finished frame (e.g. translucency). */
  finish?: (canvas: HTMLCanvasElement) => HTMLCanvasElement;
}

const SIZE = 16;

function character(palette: Palette, heads: Views<Rows>, bodies: Views<BodyDef>): FieldCharDef {
  return {
    palette,
    down: { head: heads.down, body: bodies.down },
    up: { head: heads.up, body: bodies.up },
    left: { head: heads.left, body: bodies.left },
  };
}

// ---------------------------------------------------------------------------
// Shared body templates (7 rows: shoulders at y=9 down to the feet at y=15)
// ---------------------------------------------------------------------------

/** Short tunic (a/A/n), belt, trousers (c/C) and shoes. */
const TUNIC: Views<BodyDef> = {
  down: {
    rows: [
      '..oaaaaaaAAAno..',
      '.oaoaaaaaAAnoAo.',
      '.osoaaaaAAAnoSo.',
      '..oolllLLLLLoo..',
      '....ocCooCCo....',
      '....oLLooLLo....',
      '....oooooooo....',
    ],
    step: ['....oLLooCCo....', '....oooooLLo....', '........oooo....'],
  },
  up: {
    rows: [
      '..oaaaaaaAAAno..',
      '.oaoaaaaaAAnoAo.',
      '.osoaaaaAAAnoSo.',
      '..oolllLLLLLoo..',
      '....ocCooCCo....',
      '....oLLooLLo....',
      '....oooooooo....',
    ],
    step: ['....ocCooLLo....', '....oLLooooo....', '....oooo........'],
  },
  left: {
    rows: [
      '....ooaaAAo.....',
      '...oaaaoAAno....',
      '...oaaosSoAo....',
      '...ollloLLLo....',
      '....ocCCCo......',
      '...oLLLLLo......',
      '...ooooooo......',
    ],
    step: ['...ocCo.oCCo....', '..oLLLo.oLLo....', '..ooooo.oooo....'],
  },
};

/** Long dress (a/A/n) with a white apron (w/W). */
const DRESS: Views<BodyDef> = {
  down: {
    rows: [
      '..oaaaaaaAAAno..',
      '.oaowwwwwWWnoAo.',
      '.osowwwwwWWWoSo.',
      '..oawwwwwWWWAo..',
      '..oawwwwwWWWAo..',
      '.oaaaaaaaAAAAno.',
      '..ooLoooooLooo..',
    ],
    step: ['.oaaaaaaaAAAAno.', '..oLLooooooooo..'],
  },
  up: {
    rows: [
      '..oaaaaaaAAAno..',
      '.oaoaaaaaAAnoAo.',
      '.osoaaawWAAnoSo.',
      '..oaaaawWAAAno..',
      '..oaaaaaAAAAno..',
      '.oaaaaaaaAAAAno.',
      '..ooLoooooLooo..',
    ],
    step: ['.oaaaaaaaAAAAno.', '..ooooooooLLo...'],
  },
  left: {
    rows: [
      '....ooaaAAo.....',
      '...oaaaoAAno....',
      '..owwwosSoAo....',
      '..owwwWoAAAo....',
      '..owwwWAAAAno...',
      '.oaaaaaAAAAno...',
      '..oLoooooooo....',
    ],
    step: ['oaaaaaAAAAno....', 'oLLooooooLo.....'],
  },
};

/** Floor-length robe (a/A/n) with a sash (c/C). */
const ROBE: Views<BodyDef> = {
  down: {
    rows: [
      '..oaaaaaaAAAno..',
      '.oaoaaaaaAAnoAo.',
      '.osoaaaaAAAnoSo.',
      '..occcccCCCCCo..',
      '..oaaaaaAAAAno..',
      '.oaaaaaaAAAAAno.',
      '..ooLoooooLooo..',
    ],
    step: ['.oaaaaaaAAAAAno.', '..oLLooooooooo..'],
  },
  up: {
    rows: [
      '..oaaaaaaAAAno..',
      '.oaoaaaaaAAnoAo.',
      '.osoaaaaAAAnoSo.',
      '..occcccCCCCCo..',
      '..oaaaaaAAAAno..',
      '.oaaaaaaAAAAAno.',
      '..ooLoooooLooo..',
    ],
    step: ['.oaaaaaaAAAAAno.', '..ooooooooLLo...'],
  },
  left: {
    rows: [
      '....ooaaAAo.....',
      '...oaaaoAAno....',
      '...oaaosSoAo....',
      '...occcoCCCo....',
      '...oaaaAAAAno...',
      '..oaaaaAAAAAno..',
      '...oLooooooo....',
    ],
    step: ['.oaaaaaAAAAno...', '.oLLooooooLo....'],
  },
};

// ---------------------------------------------------------------------------
// Party
// ---------------------------------------------------------------------------

const HERO = character(
  P.HERO,
  {
    down: [
      '....oo.oo.oo....',
      '...ohhohhohho...',
      '..ohhhhhhhhhHo..',
      '.ohhHhhhhhhHHko.',
      '.okHhHhhhHhHkko.',
      '..oHhHssssHhko..',
      '..oHhsesseshko..',
      '..okhsesseSHko..',
      '...okssssSSko...',
    ],
    up: [
      '....oo.oo.oo....',
      '...ohhohhohho...',
      '..ohhhhhhhhhHo..',
      '.ohhHhhhhhhHHko.',
      '.okHhHhhhHhHkko.',
      '..oHhHhhhhHhko..',
      '..oHhhHhhHhHko..',
      '..okHhkHHkHkko..',
      '...okkHkkHkko...',
    ],
    left: [
      '......oo.oo.....',
      '....oohhohhoo...',
      '...ohhhhhhhhhoo.',
      '..ohhhhhhhhhhHHo',
      '..ohhhhhhhhhHkko',
      '..ohhhhHhhhHkko.',
      '..ohsesHhhHHko..',
      '.osssesShHkkko..',
      '..ossSSokkko....',
    ],
  },
  {
    down: {
      rows: [
        '.omMorrrrrRoMNo.',
        '.oMNoaraAAAoNNo.',
        '.osSoaRaAAnosSo.',
        '..oolllyLLLLoo..',
        '....oAnooAno....',
        '....olLooLLo....',
        '....oooooooo....',
      ],
      step: ['....olLooAno....', '....oooooLLo....', '........oooo....'],
    },
    up: {
      rows: [
        '.omMorrrrrRoMNo.',
        '.oMNoaarRAAoNNo.',
        '.osSoaarRAnosSo.',
        '..oolllRLLLLoo..',
        '....oAnooAno....',
        '....olLooLLo....',
        '....oooooooo....',
      ],
      step: ['....oAnooLLo....', '....olLooooo....', '....oooo........'],
    },
    left: {
      rows: [
        '...oorrrrrRoRo..',
        '...oaaomMMNoRRo.',
        '...oaaoNsSoARo..',
        '...ollyLoLLLo...',
        '....oAAnAno.....',
        '...olLLLLo......',
        '...ooooooo......',
      ],
      step: ['...oAAo.oAno....', '..olLLo.oLLo....', '..oooo..oooo....'],
    },
  },
);

const CLERIC = character(
  P.CLERIC,
  {
    down: [
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '...ohhhhhhhHo...',
      '..ohhhhhhhhhHo..',
      '..ohyyygGyYYHo..',
      '..ohhsesseshHo..',
      '..ohhsesseSHHo..',
      '..ohHsssSSSHko..',
      '..ohHo....oHko..',
      '..ohHo....oHko..',
      '...oo......oo...',
    ],
    up: [
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '...ohhhhhhhHo...',
      '..ohhhhhhhhhHo..',
      '..oYyyyyyyyYYo..',
      '..ohHhhhhhhHHo..',
      '..ohHhhhhhHHko..',
      '..ohHhhhhHhHko..',
      '..ohHhhhhHhHko..',
      '..okHhHhHhHkko..',
      '...okHkHkHkko...',
      '....oooooooo....',
    ],
    left: [
      '................',
      '.....oooooo.....',
      '....ohhhhhhoo...',
      '...ohhhhhhhhHo..',
      '..ohhhhhhhhhHHo.',
      '..oygyyyYYYHHko.',
      '..ohsesHhhhHHko.',
      '.osssesShhHHkko.',
      '..ossSSohHHkko..',
      '......ohHHkko...',
      '......ohHHkko...',
      '......okkkko....',
      '.......oooo.....',
    ],
  },
  {
    down: {
      rows: [
        '....occcCCCo....',
        '...oaaacCAAAo...',
        '..oaaaasSAAAno..',
        '..oaaaacCAAAno..',
        '..oaaaacCAAAno..',
        '.occcccccCCCCCo.',
        '..ooLoooooLooo..',
      ],
      step: ['.occcccccCCCCCo.', '..oLLooooooooo..'],
    },
    up: {
      rows: [
        '....occcCCCo....',
        '...oaaaaAAAAo...',
        '..oaaaaaAAAAno..',
        '..oaaaaaAAAAno..',
        '..oaaaaaAAAAno..',
        '.occcccccCCCCCo.',
        '..ooLoooooLooo..',
      ],
      step: ['.occcccccCCCCCo.', '..ooooooooLLo...'],
    },
    left: {
      rows: [
        '....occCCo......',
        '...oaaacAAo.....',
        '..oassSoAAo.....',
        '..oaacAAAAno....',
        '..oaacAAAAAno...',
        '.occccCCCCCCo...',
        '..oLoooooooo....',
      ],
      step: ['occccCCCCCCo....', 'oLLooooooLo.....'],
    },
  },
);

const MAGE = character(
  P.MAGE,
  {
    down: [
      '........oo......',
      '.......ohko.....',
      '......ohhHo.....',
      '.....ohhhHko....',
      '....ohhhhHHko...',
      '...oyyyyyyYYo...',
      'ohhhhhhhhhhhHHko',
      '.okkkkkkkkkkkko.',
      '...oxxxxxxxxo...',
      '...oxxzxxzxxo...',
    ],
    up: [
      '........oo......',
      '.......ohko.....',
      '......ohhHo.....',
      '.....ohhhHko....',
      '....ohhhhHHko...',
      '...oyyyyyyYYo...',
      'ohhhhhhhhhhhHHko',
      '.okkkkkkkkkkkko.',
      '...okkkkkkkko...',
      '...okkkkkkkko...',
    ],
    left: [
      '..........ooo...',
      '.........ohHko..',
      '........ohHo....',
      '.......ohhHo....',
      '......ohhhHko...',
      '.....oyyyyyYYo..',
      'ohhhhhhhhhhhHHko',
      '.okkkkkkkkkkkko.',
      '...oxxxxxkkko...',
      '...oxzxxxkkko...',
    ],
  },
  {
    down: {
      rows: [
        '..orrrrrrrRRRo..',
        '.oaoaarRAAAnoAo.',
        '.oLoaarRAAAnoLo.',
        '..oaayaRAAyAno..',
        '.onnynnnnynnnno.',
        '..ooLoooooLooo..',
      ],
      step: ['.onnynnnnynnnno.', '..oLLooooooooo..'],
    },
    up: {
      rows: [
        '..orrrrrrrRRRo..',
        '.oaoaaarRAAnoAo.',
        '.oLoaaarRAAnoLo.',
        '..oaaaarRAAAno..',
        '.onnnnnRnnnnnno.',
        '..ooLoooooLooo..',
      ],
      step: ['.onnnnnRnnnnnno.', '..ooooooooLLo...'],
    },
    left: {
      rows: [
        '..orrrrrrRRoRRo.',
        '...oaaaaAAnoRo..',
        '...oaaaoLoAAo...',
        '...oaayaaAAno...',
        '..onnnynnnnnno..',
        '...oLooooooo....',
      ],
      step: ['.onnnynnnnnno...', '.oLLooooooLo....'],
    },
  },
);

// ---------------------------------------------------------------------------
// Townsfolk
// ---------------------------------------------------------------------------

/** Balding old man with a long beard; the cane is part of the head layer. */
const ELDER = character(
  P.ELDER,
  {
    down: [
      '................',
      '.....oooooo.....',
      '....oSssssSo....',
      '...osssssSSSo...',
      '..ohssssssSSHo..',
      '..ohHssssSSHho..',
      '..ohHeseeSeHho..',
      '..ohwwwwwwWWho..',
      '..olowwwwwWWWo..',
      '.oyoowwwwWWWo...',
      '.olo.owwWWWo....',
      '.olo..owWWo.....',
      '.oLo...oo.......',
      '.oLo............',
      '.oLo............',
      '.ooo............',
    ],
    up: [
      '................',
      '.....oooooo.....',
      '....oSssssSo....',
      '...osssssSSSo...',
      '..ohssssssSSHo..',
      '..ohHsssssSHho..',
      '..ohHhhhhhHHho..',
      '..ohhhhhhhHHko..',
      '...ohHhhHhkko...',
      '....oookkoo....o',
      '..............oy',
      '..............ol',
      '..............ol',
      '..............oL',
      '..............oL',
      '..............oo',
    ],
    left: [
      '................',
      '.....oooooo.....',
      '....osssssSo....',
      '...osssssSSSo...',
      '..ossssssSHHho..',
      '..ohssssShHHko..',
      '..ohsesShHHko...',
      '.osswwwShHkko...',
      'oyowwwWWokko....',
      'olowwwWWo.......',
      'oloowWWo........',
      'olo.oWo.........',
      'oLo..o..........',
      'oLo.............',
      'oLo.............',
      'ooo.............',
    ],
  },
  ROBE,
);

const MAN = character(
  P.MAN,
  {
    down: [
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '...ohhhhhhhHo...',
      '..ohhhhhhhhHko..',
      '..ohHhhhhhHHko..',
      '..oHssesseSSko..',
      '..okssesseSSko..',
      '...ossssssSSo...',
    ],
    up: [
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '...ohhhhhhhHo...',
      '..ohhhhhhhhHko..',
      '..ohHhhhhhHHko..',
      '..oHhHhhhHhHko..',
      '..okHhhHhHHkko..',
      '...okkHkkHkko...',
    ],
    left: [
      '................',
      '.....oooooo.....',
      '....ohhhhhhoo...',
      '...ohhhhhhhhHo..',
      '..ohhhhhhhhHHko.',
      '..ohhhhhHhhHkko.',
      '..ohsesHhhHHko..',
      '.osssesShHkkko..',
      '..ossSSokkko....',
    ],
  },
  TUNIC,
);

const WOMAN = character(
  P.WOMAN,
  {
    down: [
      '......oooo......',
      '.....ohhhHo.....',
      '....oohhHHoo....',
      '...ohhhhhhhHo...',
      '..ohhhhhhhhhHo..',
      '..ohHhhhhhhHko..',
      '..ohhsesseshko..',
      '..ohhsesseSHko..',
      '..ohHssssSSHko..',
      '..ohHo....oHko..',
      '...oo......oo...',
    ],
    up: [
      '......oooo......',
      '.....ohhhHo.....',
      '....oohhHHoo....',
      '...ohhhhhhhHo...',
      '..ohhhhhhhhhHo..',
      '..ohHhhhhhhHko..',
      '..ohhHhhhhHhko..',
      '..ohHhhhhHhHko..',
      '..ohHhHhHhHHko..',
      '..ohHkHkHkHkko..',
      '...oooooooooo...',
    ],
    left: [
      '..........oooo..',
      '.........ohhHko.',
      '.....ooooohHkko.',
      '....ohhhhhhokko.',
      '...ohhhhhhhhHo..',
      '..ohhhhhhHhHHko.',
      '..ohsesHhhHHko..',
      '.osssesShHkkko..',
      '..ossSSohHHko...',
      '.......ohHko....',
      '........ooo.....',
    ],
  },
  DRESS,
);

/** Smaller than the adults: the head starts 3px lower. */
const CHILD = character(
  P.CHILD,
  {
    down: [
      '................',
      '................',
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '...ohhhhhhhHo...',
      '...ohHhhhhHHo...',
      '...oHsesseSHo...',
      '...oksesseSko...',
      '....ossssSSo....',
    ],
    up: [
      '................',
      '................',
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '...ohhhhhhhHo...',
      '...ohHhhhhHHo...',
      '...oHhHhhHhHo...',
      '...okHhkHhHko...',
      '....okkHkkko....',
    ],
    left: [
      '................',
      '................',
      '................',
      '.....ooooo......',
      '....ohhhhhoo....',
      '...ohhhhhhhHo...',
      '...ohhhhHhHko...',
      '...osesHhHHko...',
      '..ossesShHko....',
      '...osSSokko.....',
    ],
  },
  {
    down: {
      rows: [
        '...oaoaaAAoAo...',
        '...osoaaAAoSo...',
        '....occcCCCo....',
        '....osSoosSo....',
        '....oLLooLLo....',
        '....oooooooo....',
      ],
      step: ['....oLLoosSo....', '....oooooLLo....', '........oooo....'],
    },
    up: {
      rows: [
        '...oaoaaAAoAo...',
        '...osoaaAAoSo...',
        '....occcCCCo....',
        '....osSoosSo....',
        '....oLLooLLo....',
        '....oooooooo....',
      ],
      step: ['....osSooLLo....', '....oLLooooo....', '....oooo........'],
    },
    left: {
      rows: [
        '....oaaAAo......',
        '....oaosoAo.....',
        '....occCCCo.....',
        '....osSSo.......',
        '....oLLLo.......',
        '....ooooo.......',
      ],
      step: ['...osSosSo......', '..oLLooLLo......', '..oooooooo......'],
    },
  },
);

/** Portly shopkeeper: cap, moustache, apron over a wide belly. */
const MERCHANT = character(
  P.MERCHANT,
  {
    down: [
      '................',
      '....oooooooo....',
      '...occcccccCo...',
      '..occcccccccCo..',
      '..oCCCCCCCCCCo..',
      '..ohsssssssSko..',
      '..ohssesseSSko..',
      '..ohsHHHHHHSko..',
      '...ossssssSSo...',
    ],
    up: [
      '................',
      '....oooooooo....',
      '...occcccccCo...',
      '..occcccccccCo..',
      '..occcccccccCo..',
      '..ohCCCCCCCCko..',
      '..ohHhhhhhHHko..',
      '..okHhhhHhHkko..',
      '...okkkkkkkko...',
    ],
    left: [
      '................',
      '.....ooooooo....',
      '....occcccccCo..',
      '...occcccccccCo.',
      '.oCCCCCCCccccCo.',
      '..ohssssSkhHHko.',
      '..osessSShHkko..',
      '.osHHHssShkkko..',
      '..ossSSSokko....',
    ],
  },
  {
    down: {
      rows: [
        '..oaaaaaaAAAno..',
        '.oaaowwwwWWoAAo.',
        'osawwwwwwWWWWASo',
        '.oowwwwwwWWWWoo.',
        '..owwwwwWWWWWo..',
        '....olLooLLo....',
        '....oooooooo....',
      ],
      step: ['....oooooLLo....', '........oooo....'],
    },
    up: {
      rows: [
        '..oaaaaaaAAAno..',
        '.oaaaaaaaAAAAAo.',
        'osaaaaawWAAAAASo',
        '.ooaaaaWwAAAAoo.',
        '..oaaaaaAAAAAo..',
        '....olLooLLo....',
        '....oooooooo....',
      ],
      step: ['....oooooLLo....', '........oooo....'],
    },
    left: {
      rows: [
        '....ooaaAAo.....',
        '..owwwoaAAAo....',
        '.owwwwosSoAAo...',
        '.owwwWWoAAAAo...',
        '..owwWWWAAAo....',
        '...olLLLLo......',
        '...ooooooo......',
      ],
      step: ['..olLo.oLLo.....', '..oooo.oooo.....'],
    },
  },
);

/** Innkeeper: headscarf, rolled sleeves, dress with apron. */
const INNKEEPER = character(
  P.INNKEEPER,
  {
    down: [
      '................',
      '.....oooooo.....',
      '....orrrrrRo....',
      '...orrrrrrrRo...',
      '..orrrrrrrrrRoo.',
      '..oRrRrrrrRRRoRo',
      '..ohhsesseshkoRo',
      '..ohhsesseSHko.o',
      '...ohssssSSko...',
    ],
    up: [
      '................',
      '.....oooooo.....',
      '....orrrrrRo....',
      '...orrrrrrrRo...',
      '..orrrrrrrrrRo..',
      '..oRrRrrrrRRRo..',
      '..ohhHrRRhHhko..',
      '..okHhoRRoHkko..',
      '...okkoRRokko...',
    ],
    left: [
      '................',
      '.....oooooo.....',
      '....orrrrrRoo...',
      '...orrrrrrrRRo..',
      '..orrrrrrrrRRRo.',
      '..oRrRrrrRRRRko.',
      '..ohsesHhhHRRoo.',
      '.osssesShHkoRRo.',
      '..ossSSokkko.oo.',
    ],
  },
  DRESS,
);

/** Town guard: kettle helmet, red tabard, steel pauldrons, spear. */
const GUARD = character(
  P.GUARD,
  {
    down: [
      '..............o.',
      '.............omo',
      '.....oooooo..oMo',
      '....ommmmMMo.oNo',
      '...ommmmmmMNo.L.',
      '..ommmmmmmMMNoL.',
      '.oMMMMMMMMMMNNoL',
      '..oNssesseSSNoL.',
      '..oNssesseSSNol.',
      '...oNssssSSNo.l.',
      '..............l.',
      '..............L.',
      '.............sL.',
      '..............L.',
      '..............L.',
      '..............o.',
    ],
    up: [
      '.o..............',
      'omo.............',
      'oMo..oooooo.....',
      'oNo.ommmmMMo....',
      '.L.ommmmmmMNo...',
      '.Lommmmmmmmmo...',
      'LoMMMMMMMMMMNNo.',
      '.LoNMMMMMMMNNo..',
      '.LoNNMMMMMNNNo..',
      '.l.oNNNNNNNNo...',
      '.l..............',
      '.L..............',
      '.LS.............',
      '.L..............',
      '.L..............',
      '.o..............',
    ],
    left: [
      '.o..............',
      'omo.............',
      'oMo..oooooo.....',
      'oNo.ommmmmMo....',
      '.L.ommmmmmMNo...',
      '.Lommmmmmmmmo...',
      'LoMMMMMMMMMMNNo.',
      '.LosesSMMMNNo...',
      '.LsssesSNNNo....',
      '.lossSSoNNo.....',
      '.l..............',
      '.L..............',
      '.L..............',
      '.L..............',
      '.L..............',
      '.o..............',
    ],
  },
  {
    down: {
      rows: [
        '.omMoaaaaAnoMNo.',
        '.oMNoaaaaAnoNNo.',
        '.osSoaaaaAnosSo.',
        '..oolllyLLLLoo..',
        '....oMNooMNo....',
        '....oNNooNNo....',
        '....oooooooo....',
      ],
      step: ['....oNNooMNo....', '....oooooNNo....', '........oooo....'],
    },
    up: {
      rows: [
        '.omMoaaaaAnoMNo.',
        '.oMNoaaaaAnoNNo.',
        '.osSoaaaaAnosSo.',
        '..oolllLLLLLoo..',
        '....oMNooMNo....',
        '....oNNooNNo....',
        '....oooooooo....',
      ],
      step: ['....oMNooNNo....', '....oNNooooo....', '....oooo........'],
    },
    left: {
      rows: [
        '....ooaaAAo.....',
        '...oaaomMNno....',
        '..sSaaoMNNAo....',
        '...ollloLLLo....',
        '....oMNNNo......',
        '...oNNNNNo......',
        '...ooooooo......',
      ],
      step: ['...oMNo.oNNo....', '..oNNNo.oNNo....', '..ooooo.oooo....'],
    },
  },
);

// ---------------------------------------------------------------------------
// Creatures & spirits
// ---------------------------------------------------------------------------

/** A ginger cat. All of it lives in the "body" layer (heads are empty). */
const CAT: FieldCharDef = {
  palette: P.CAT,
  down: {
    head: [],
    body: {
      rows: [
        '.....o....o.....',
        '....oro..oro....',
        '....oaaaaaAo....',
        '...oaeaaaaeAo...',
        '...oaawrrwAAo...',
        '....oawwwWAo.oo.',
        '...oaawwwWAAoAo.',
        '...oaawwWWAAoAo.',
        '...oawoaAowAoo..',
        '....oo.oo.oo....',
      ],
      step: ['...oawoaAooAo...', '....oo.oo.oo....'],
    },
  },
  up: {
    head: [],
    body: {
      rows: [
        '.....o....o.....',
        '....oao..oao....',
        '....oaaaaaAo....',
        '...oaaaaaaaAo...',
        '...oaaAaaAAAo...',
        '....oaaaaAAo..o.',
        '...oaaaaAAAAooAo',
        '...oaAaaaAAAAoAo',
        '...oaAAaaAAAnoo.',
        '...oaAo..oAAo...',
        '...ooo....ooo...',
      ],
      step: ['...oaAo...oAo...', '...ooo....ooo...'],
    },
  },
  left: {
    head: [],
    body: {
      rows: [
        '............oo..',
        '..o..o.....oAo..',
        '.orooao....oAo..',
        '.oaaaaao...oAo..',
        'oaeaaaAAo..oAo..',
        'orwaaaAAoooAo...',
        '.owwaaaaaaaAAo..',
        '..owwaaaaaAAAo..',
        '..owAoooooAAno..',
        '..owo....oAo....',
        '..ooo....ooo....',
      ],
      step: ['.owo......oAo...', '.ooo......ooo...'],
    },
  },
};

/** Softly glowing, hovering spirit: drawn opaque then made translucent in `finish`. */
const SPIRIT: FieldCharDef = {
  ...character(
    P.SPIRIT,
    {
      down: [
        '................',
        '.....oooooo.....',
        '....ohhhhhHo....',
        '...ohhhhhhhHo...',
        '..ohhhhhhhhhHo..',
        '..ohHhhhhhhHko..',
        '..ohhssssssHko..',
        '..ohhsesseSHko..',
        '..ohHssssSSHko..',
        '...oko....oko...',
      ],
      up: [
        '................',
        '.....oooooo.....',
        '....ohhhhhHo....',
        '...ohhhhhhhHo...',
        '..ohhhhhhhhhHo..',
        '..ohHhhhhhhHko..',
        '..ohhHhhhhHHko..',
        '..ohHhhhhHhHko..',
        '..okHhHhHhHkko..',
        '...okkHkHkkko...',
        '....oooooooo....',
      ],
      left: [
        '................',
        '.....oooooo.....',
        '....ohhhhhhoo...',
        '...ohhhhhhhhHo..',
        '..ohhhhhhhhhHHo.',
        '..ohhhhhHhhHHko.',
        '..ohssshhhHHko..',
        '.osseesShhHHko..',
        '..ossSSohHHkko..',
        '......okHkkko...',
        '.......oooo.....',
      ],
    },
    {
      down: {
        rows: [
          '...oaaaaaAAAo...',
          '..oaoaaaaAAoAo..',
          '..osoaaaaAAoSo..',
          '...oaaaaaAAAo...',
          '....oaaaaAAo....',
          '.....oaaAAo.....',
          '......oAAo......',
        ],
        step: ['....oaaaaAAo....', '......oaAAo.....', '.......oAAo.....'],
      },
      up: {
        rows: [
          '...oaaaaaAAAo...',
          '..oaoaaaaAAoAo..',
          '..osoaaaaAAoSo..',
          '...oaaaaaAAAo...',
          '....oaaaaAAo....',
          '.....oaaAAo.....',
          '......oAAo......',
        ],
        step: ['....oaaaaAAo....', '.....oaAAo......', '.....oAAo.......'],
      },
      left: {
        rows: [
          '....oaaAAo......',
          '...oaaaoAAo.....',
          '...oaaosoAo.....',
          '...oaaaAAAo.....',
          '....oaaAAAAo....',
          '......oaAAAo....',
          '........oAAo....',
        ],
        step: ['....oaaAAAAo....', '.....oaAAAo.....', '.......oAAAo....'],
      },
    },
  ),
  finish: (canvas) => {
    // A pale halo behind a see-through body.
    const out = createCanvas(SIZE, SIZE);
    const ctx = ctx2d(out);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(outline(canvas, '#bfe8ff'), 0, 0);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(canvas, 0, 0);
    return out;
  },
};

const DEFS: Record<FieldSpriteId, FieldCharDef> = {
  hero: HERO,
  cleric: CLERIC,
  mage: MAGE,
  elder: ELDER,
  man: MAN,
  woman: WOMAN,
  child: CHILD,
  merchant: MERCHANT,
  innkeeper: INNKEEPER,
  guard: GUARD,
  cat: CAT,
  spirit: SPIRIT,
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function buildView(def: FieldCharDef, view: ViewDef, frame: 0 | 1): HTMLCanvasElement {
  const { rows, step } = view.body;
  const body = frame === 0 ? rows : [...rows.slice(0, rows.length - step.length), ...step];
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = ctx2d(canvas);
  ctx.drawImage(spriteFromRows(body, def.palette), 0, SIZE - body.length);
  if (view.head.length > 0) ctx.drawImage(spriteFromRows(view.head, def.palette), 0, 0);
  return def.finish ? def.finish(canvas) : canvas;
}

const cache = new Map<string, HTMLCanvasElement>();

export function getFieldSprite(id: FieldSpriteId, facing: Facing, frame: 0 | 1): HTMLCanvasElement {
  const key = `${id}/${facing}/${frame}`;
  let sprite = cache.get(key);
  if (!sprite) {
    const def = DEFS[id];
    sprite = facing === 'right' ? flipX(getFieldSprite(id, 'left', frame)) : buildView(def, def[facing], frame);
    cache.set(key, sprite);
  }
  return sprite;
}
