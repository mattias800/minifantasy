import type { MapDef } from './types';

/** The isle of Lumen. Willowmere in the south, the Hollow Grotto in the north-eastern mountains. */
export const overworld: MapDef = {
  id: 'overworld',
  name: 'Isle of Lumen',
  music: 'overworld',
  canSave: true,
  legend: {
    '~': 'water',
    '.': 'grass',
    ',': 'flowers',
    F: 'forest',
    h: 'hills',
    M: 'mountain',
    s: 'sand',
    '=': 'path',
    B: 'bridge',
    T: 'town',
    C: 'cave_entrance',
  },
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~sssss~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~sssss.....sssss~~~~~hMMMM~~~~~~',
    '~~~~~~~ss.............s~~~hhMMMMMMh~~~~~',
    '~~~~~~s...FFFFFFFF.....shhMMMMMMMMh~~~~~',
    '~~~~ss...FFFFFFFFFF.....hMMMMMMMMMMh~~~~',
    '~~~~s...FFFFFFFFFFFF.....hMMMMMMMMMh~~~~',
    '~~~~s...FFFFFFFFFFFF.......hhhMCMhh.s~~~',
    '~~~s..,,,,.FFFFFF...============....s~~~',
    '~~~s..,,............=..............s~~~~',
    '~~~ss...............=....FFFFF.....s~~~~',
    '~~~~s...hhhh........=...FFFFFFF....s~~~~',
    '~~~~s....hh.........=....FFFFF....ss~~~~',
    '~~~~~ss.............=.............s~~~~~',
    '~~~~~~~~~~~~~~~~~~~~B~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~B~~~~~~~~~~~~~~~~~~~',
    '~~~~~ss.............=............ss~~~~~',
    '~~~~s....FFF........=......,,.....s~~~~~',
    '~~~s....FFFFF.......=.....,,,,....s~~~~~',
    '~~~s.....FFF........=.....hhh.....s~~~~~',
    '~~~s................=....hhhhh....s~~~~~',
    '~~~s.......T=========.....hhh.....s~~~~~',
    '~~~s..............................s~~~~~',
    '~~~ss.................~~~........ss~~~~~',
    '~~~~s....,,,.........~~~~~.......s~~~~~~',
    '~~~~ss...............~~~~......sss~~~~~~',
    '~~~~~sss...............sssssss~~~~~~~~~~',
    '~~~~~~~sssssssssssssss~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  encounters: [
    {
      // South of the river: gentle monsters near town.
      steps: 24,
      region: { x0: 0, y0: 16, x1: 39, y1: 29 },
      formations: [
        { weight: 3, enemies: ['jelly'] },
        { weight: 3, enemies: ['jelly', 'jelly'] },
        { weight: 2, enemies: ['hornhare'] },
        { weight: 2, enemies: ['goblin'] },
        { weight: 2, enemies: ['jelly', 'hornhare'] },
        { weight: 1, enemies: ['goblin', 'jelly'] },
      ],
    },
    {
      // North of the river: tougher.
      steps: 22,
      region: { x0: 0, y0: 0, x1: 39, y1: 13 },
      formations: [
        { weight: 2, enemies: ['goblin', 'goblin'] },
        { weight: 3, enemies: ['wolf'] },
        { weight: 2, enemies: ['sporecap'] },
        { weight: 1, enemies: ['wolf', 'hornhare'] },
        { weight: 2, enemies: ['sporecap', 'goblin'] },
        { weight: 1, enemies: ['hornhare', 'hornhare', 'hornhare'] },
      ],
    },
  ],
  warps: [
    { x: 11, y: 21, to: 'town', tx: 14, ty: 19, facing: 'up' },
    { x: 31, y: 7, to: 'cave1', tx: 14, ty: 21, facing: 'up', sfx: 'stairs' },
  ],
  triggers: [
    {
      id: 'grotto_seal',
      x: 31,
      y: 8,
      when: (st) => !st.hasFlag('seal_broken'),
      run: async (s) => {
        s.face('player', 'up');
        await s.say('A shimmering seal of light bars the mouth of the cave.');
        await s.say('The Sun Charm grows warm in your hand...');
        s.sfx('magicCharge');
        await s.wait(500);
        await s.flash('#fff');
        s.sfx('revive');
        s.shake(2, 300);
        await s.say('The seal shatters into motes of light! The Hollow Grotto lies open.');
        s.state.setFlag('seal_broken');
      },
    },
  ],
};
