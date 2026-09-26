import type { MapDef } from './types';

const INTERIOR_LEGEND = {
  '#': 'int_wall',
  '.': 'floor',
  c: 'counter',
  B: 'bed',
  t: 'table',
  s: 'shelf',
  o: 'barrel',
  r: 'rug',
  H: 'hearth',
  m: 'mat',
  p: 'plant',
} as const;

const INN_PRICE = 20;

export const inn: MapDef = {
  id: 'inn',
  name: 'The Sleepy Willow',
  music: 'town',
  legend: INTERIOR_LEGEND,
  rows: [
    '############',
    '#########Hs#',
    '#p.B..B....#',
    '#..........#',
    '#cccc...t..#',
    '#.........o#',
    '#...rrrr...#',
    '#...rrrr..p#',
    '#####mm#####',
  ],
  warps: [
    { x: 5, y: 8, to: 'town', tx: 6, ty: 6, facing: 'down', sfx: 'door' },
    { x: 6, y: 8, to: 'town', tx: 6, ty: 6, facing: 'down', sfx: 'door' },
  ],
  npcs: [
    {
      id: 'innkeeper',
      sprite: 'innkeeper',
      x: 2,
      y: 3,
      facing: 'down',
      talk: async (s) => {
        await s.inn(INN_PRICE);
      },
    },
    {
      id: 'traveler',
      sprite: 'man',
      x: 9,
      y: 5,
      facing: 'left',
      talk: async (s) => {
        await s.say(
          "I came down from the mountain pass. In that Grotto the bones walk and the very rocks get up and fight! Fire is what the dead fear, they say. And the rock-things? Try ice.",
          'Traveler',
        );
      },
    },
  ],
};

export const shop: MapDef = {
  id: 'shop',
  name: 'Willowmere Goods',
  music: 'town',
  legend: INTERIOR_LEGEND,
  rows: [
    '##############',
    '#ss##ss#ss####',
    '#...o......o.#',
    '#............#',
    '#cccc....cccc#',
    '#............#',
    '#p..........p#',
    '#.....rr.....#',
    '######mm######',
  ],
  warps: [
    { x: 6, y: 8, to: 'town', tx: 21, ty: 14, facing: 'down', sfx: 'door' },
    { x: 7, y: 8, to: 'town', tx: 21, ty: 14, facing: 'down', sfx: 'door' },
  ],
  npcs: [
    {
      id: 'merchant',
      sprite: 'merchant',
      x: 2,
      y: 3,
      facing: 'down',
      talk: async (s) => {
        await s.shop('items');
      },
    },
    {
      id: 'smith',
      sprite: 'man',
      x: 11,
      y: 3,
      facing: 'down',
      talk: async (s) => {
        await s.shop('arms');
      },
    },
  ],
};

export const elderHouse: MapDef = {
  id: 'elder_house',
  name: "Elder's House",
  music: 'town',
  legend: INTERIOR_LEGEND,
  rows: [
    '##############',
    '#ss####H###ss#',
    '#...p........#',
    '#............#',
    '#..rrrrrr....#',
    '#..rrrrrr..t.#',
    '#..rrrrrr....#',
    '#B..........o#',
    '#p..........p#',
    '######mm######',
  ],
  warps: [
    { x: 6, y: 9, to: 'town', tx: 16, ty: 6, facing: 'down', sfx: 'door' },
    { x: 7, y: 9, to: 'town', tx: 16, ty: 6, facing: 'down', sfx: 'door' },
  ],
  chests: [{ id: 'elder_chest', x: 11, y: 3, item: 'potion', qty: 2 }],
  npcs: [
    {
      id: 'elder',
      sprite: 'elder',
      x: 6,
      y: 4,
      facing: 'down',
      talk: async (s) => {
        if (s.state.hasFlag('wyrm_defeated')) {
          await s.say('The light has returned. You have done what no one else could.', 'Elder Maren');
        } else if (s.state.hasFlag('troll_defeated')) {
          await s.say('You have gone deep indeed. The heart of the Grotto lies below. May the dawn guide you.', 'Elder Maren');
        } else {
          await s.say(
            'The Hollow Grotto lies north-east, across the old bridge, at the foot of the mountains. May the dawn guide you.',
            'Elder Maren',
          );
        }
      },
    },
    // Present only during the opening scene; they "join" the leader afterwards.
    { id: 'lyra', sprite: 'cleric', x: 5, y: 7, facing: 'up', visible: (st) => !st.hasFlag('intro_done') },
    { id: 'orrin', sprite: 'mage', x: 7, y: 7, facing: 'up', visible: (st) => !st.hasFlag('intro_done') },
  ],
  inspect: [
    {
      x: 1,
      y: 1,
      run: async (s) => {
        await s.say('A dusty book lies open: "...and the Wyrm of shadow was driven down, for it could not abide the light of dawn..."');
      },
    },
    {
      x: 2,
      y: 1,
      run: async (s) => {
        await s.say('Shelves of old almanacs. Every page about the weather ends with "ask the Heartstone."');
      },
    },
  ],
  onEnter: async (s) => {
    if (s.state.hasFlag('intro_done')) return;
    await s.fadeIn(800);
    await s.say('Kael, Lyra, Orrin... thank you for coming so quickly.', 'Elder Maren');
    await s.say(
      'You have seen it yourselves. The days grow short. The flowers close at noon. Monsters roam where children once played.',
      'Elder Maren',
    );
    await s.say(
      'The Heartstone, sleeping deep within the Hollow Grotto, is fading. Something in the dark is drinking its light.',
      'Elder Maren',
    );
    s.face('lyra', 'right');
    await s.say("The chapel candles won't stay lit, Elder. Even the spirits are restless.", 'Lyra');
    s.face('orrin', 'left');
    await s.say('Hmph. I felt it too. A hunger... ancient, and very, very large.', 'Orrin');
    s.face('lyra', 'up');
    s.face('orrin', 'up');
    await s.say(
      'Long ago our ancestors sealed the Grotto with this charm, so none could disturb the stone. Take it. It will open the way.',
      'Elder Maren',
    );
    await s.giveItem('suncharm');
    await s.say(
      'The Grotto lies north-east, past the old bridge. And take this as well. Buy what you need before you set out.',
      'Elder Maren',
    );
    await s.giveGold(100);
    await s.say("We'll bring back the light, Elder. I promise.", 'Kael');
    await s.walk('lyra', ['right']);
    s.hideNpc('lyra');
    await s.walk('orrin', ['left']);
    s.hideNpc('orrin');
    s.sfx('confirm');
    await s.say('Lyra and Orrin joined the party!');
    await s.say('(Arrows: move   Z/Enter: talk, confirm   X/Esc: menu, cancel   Shift: dash)');
    await s.say('(You can save from the menu while on the world map, or at a save crystal.)');
    s.state.setFlag('intro_done');
  },
};
