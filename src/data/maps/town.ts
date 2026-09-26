import type { MapDef } from './types';

/** Willowmere, the only village on the isle. */
export const town: MapDef = {
  id: 'town',
  name: 'Willowmere',
  music: 'town',
  legend: {
    '.': 'grass',
    ',': 'flowers',
    ':': 'cobble',
    T: 'tree',
    b: 'bush',
    f: 'fence',
    R: 'roof',
    W: 'wall',
    w: 'window',
    D: 'door',
    I: 'wall_sign_inn',
    S: 'wall_sign_item',
    O: 'well',
    L: 'lamp',
    '~': 'water',
  },
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TT.,......b.........b...,.TT',
    'T...........RRRRRRRR.......T',
    'T..RRRRRR...RRRRRRRR....T..T',
    'T..RRRRRR...RRRRRRRR.......T',
    'T..WwIDwW...WwWWDWwW...b...T',
    'T.....:.........:..........T',
    'T..L..:::::::::::::::::.L..T',
    'T...........:::::..........T',
    'T.b.........::O::..........T',
    'T...........:::::..........T',
    'T..RRRRRR...:::::..RRRRRR..T',
    'T..RRRRRR.....:....RRRRRR..T',
    'T..WwWDwW.....:....WSDwWW..T',
    'T.....:.......:......:.....T',
    'T.,...::::::::::::::::..,..T',
    'T.ff..........:.......~~~..T',
    'T.ff..,,......:......~~~~..T',
    'T.......b.....:..,...~~~...T',
    'TT.T..........:.........T.TT',
    'TTTTTTTTTTTTT.:.TTTTTTTTTTTT',
  ],
  exit: { to: 'overworld', tx: 11, ty: 22, facing: 'down' },
  warps: [
    { x: 6, y: 5, to: 'inn', tx: 5, ty: 7, facing: 'up', sfx: 'door' },
    { x: 16, y: 5, to: 'elder_house', tx: 6, ty: 8, facing: 'up', sfx: 'door' },
    { x: 21, y: 13, to: 'shop', tx: 6, ty: 7, facing: 'up', sfx: 'door' },
    {
      x: 6,
      y: 13,
      to: 'town',
      tx: 6,
      ty: 14,
      facing: 'down',
      when: () => false,
      blocked: async (s) => {
        await s.say("It's locked. Thunderous snoring rumbles from inside.");
      },
    },
  ],
  npcs: [
    {
      id: 'guard',
      sprite: 'guard',
      x: 15,
      y: 18,
      facing: 'left',
      talk: async (s) => {
        if (s.state.hasFlag('troll_defeated')) {
          await s.say('You beat a cave troll? I... I need to sit down.', 'Guard');
        } else {
          await s.say(
            "Kael! Monsters prowl the fields even at noon now. If you're hurt, rest at the Sleepy Willow. Twenty gold well spent!",
            'Guard',
          );
        }
      },
    },
    {
      id: 'well_woman',
      sprite: 'woman',
      x: 11,
      y: 9,
      facing: 'right',
      wander: true,
      talk: async (s) => {
        await s.say('The well water has turned cold as winter. Even the sunlight feels... thinner, somehow.', 'Villager');
      },
    },
    {
      id: 'farmer',
      sprite: 'man',
      x: 4,
      y: 17,
      facing: 'down',
      talk: async (s) => {
        await s.say("My sheep won't leave the barn. Can't say I blame 'em. North of the river it's all wolves and walking mushrooms.", 'Farmer');
        await s.say('Mushrooms that spit poison, mind you. Carry antidotes!', 'Farmer');
      },
    },
    {
      id: 'child',
      sprite: 'child',
      x: 19,
      y: 16,
      facing: 'down',
      wander: true,
      talk: async (s) => {
        if (s.state.hasFlag('wyrm_defeated')) {
          await s.say('The sky is so bright again! Thank you, Mister Knight!', 'Pip');
        } else {
          await s.say("Mister Knight! Are you gonna fight a dragon? If you do, bring me a scale! A shiny one!", 'Pip');
        }
      },
    },
    {
      id: 'cat',
      sprite: 'cat',
      x: 4,
      y: 7,
      facing: 'down',
      wander: true,
      talk: async (s) => {
        s.sfx('cursor');
        await s.say('Mrrrow.');
        await s.say('The cat regards you with deep, unblinking suspicion.');
      },
    },
    {
      id: 'lamp_man',
      sprite: 'elder',
      x: 23,
      y: 8,
      facing: 'down',
      talk: async (s) => {
        await s.say(
          'In my youth, the Heartstone shone so bright you could read by it at midnight. Now look at these lamps... we light them at noon.',
          'Old Tobin',
        );
      },
    },
  ],
  inspect: [
    {
      x: 14,
      y: 9,
      run: async (s) => {
        if (!s.state.hasFlag('well_potion')) {
          s.state.setFlag('well_potion');
          await s.say('You peer into the well... Something glints on a ledge just below the rim.');
          await s.giveItem('potion');
        } else {
          await s.say('Cold, dark water. Your reflection looks tired.');
        }
      },
    },
  ],
};
