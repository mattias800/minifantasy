import type { MapDef, ScriptFn } from './types';

const CAVE_LEGEND = {
  '#': 'cave_wall',
  '.': 'cave_floor',
  r: 'rock',
  '~': 'cave_water',
  t: 'torch',
  '>': 'stairs_down',
  '<': 'stairs_up',
  E: 'cave_mouth',
  A: 'altar',
} as const;

/** Save crystals also restore the party, so the boss fights are fair. */
const saveCrystal: ScriptFn = async (s) => {
  s.healParty();
  s.sfx('heal');
  await s.flash('#c0f0ff');
  await s.say('A gentle light washes over the party. HP and MP restored!');
  const choice = await s.ask('Save your progress?', ['Yes', 'No']);
  if (choice === 0) await s.save();
};

export const cave1: MapDef = {
  id: 'cave1',
  name: 'Hollow Grotto B1',
  music: 'dungeon',
  battleBackground: 'cave',
  legend: CAVE_LEGEND,
  rows: [
    '##############################',
    '##############################',
    '###########t##>##t############',
    '##########.........###########',
    '##.....###.........###########',
    '##..~~.###.........###########',
    '##..~~.###.........###########',
    '##.....#######.###############',
    '######.#######......##########',
    '######.############.#####t####',
    '######.############.###.....##',
    '##.....r###########.###.....##',
    '##..~~~.####t####t#.###...r.##',
    '##..~~~.#............##.....##',
    '##..~~~.#.........r..##.....##',
    '##......#...r...............##',
    '##...................##.~~..##',
    '##......#............##.~~..##',
    '##r.....#.~~.........##r....##',
    '#########.~~........r#########',
    '##############..##############',
    '##############..##############',
    '##############EE##############',
    '##############################',
  ],
  encounters: [
    {
      steps: 20,
      formations: [
        { weight: 2, enemies: ['bat'] },
        { weight: 2, enemies: ['bat', 'bat'] },
        { weight: 2, enemies: ['magmajelly'] },
        { weight: 1, enemies: ['bat', 'magmajelly'] },
        { weight: 1, enemies: ['boneknight'] },
        { weight: 1, enemies: ['sporecap', 'bat'] },
      ],
    },
  ],
  warps: [
    { x: 14, y: 22, to: 'overworld', tx: 31, ty: 8, facing: 'down', sfx: 'stairs' },
    { x: 15, y: 22, to: 'overworld', tx: 31, ty: 8, facing: 'down', sfx: 'stairs' },
    { x: 14, y: 2, to: 'cave2', tx: 3, ty: 3, facing: 'down', sfx: 'stairs' },
  ],
  chests: [
    { id: 'b1_moonrod', x: 6, y: 4, item: 'moon_rod' },
    { id: 'b1_hipotion', x: 2, y: 12, item: 'hipotion', qty: 2 },
    { id: 'b1_ether', x: 27, y: 10, item: 'ether', qty: 2 },
    { id: 'b1_gold', x: 9, y: 13, gold: 250 },
    { id: 'b1_plume', x: 27, y: 17, item: 'plume' },
  ],
  objects: [
    { id: 'b1_save', x: 10, y: 15, kind: 'save_crystal', talk: saveCrystal },
    { id: 'troll', x: 14, y: 4, kind: 'monster', art: 'troll', visible: (st) => !st.hasFlag('troll_defeated') },
  ],
  triggers: [
    {
      id: 'troll_fight',
      x: 10,
      y: 6,
      w: 9,
      h: 1,
      when: (st) => !st.hasFlag('troll_defeated'),
      run: async (s) => {
        s.face('player', 'up');
        s.shake(3, 400);
        s.sfx('bossDie');
        await s.say('GRRRAAAHH!! Tiny people! Troll guard stairs! Nobody go down!', 'Cave Troll');
        await s.say('...Troll SMASH tiny people now!', 'Cave Troll');
        const won = await s.battle(['troll'], { boss: true, background: 'cave' });
        if (!won) return;
        s.state.setFlag('troll_defeated');
        await s.say('The troll topples with a ground-shaking thud. The stairs down lie open.');
      },
    },
  ],
};

export const cave2: MapDef = {
  id: 'cave2',
  name: 'Hollow Grotto B2',
  music: 'dungeon',
  battleBackground: 'cave',
  legend: CAVE_LEGEND,
  rows: [
    '#########################',
    '##############t#####t####',
    '###<##t#####r.........r##',
    '##......####.....A.....##',
    '##......####...........##',
    '##......####...........##',
    '##......####...........##',
    '####.#######~~.......~~##',
    '####.#######~~.......~~##',
    '####.###########.########',
    '####.####t####.....######',
    '##........r.##.....######',
    '##.....~~...##.....######',
    '##.....~~..........######',
    '##..........##.....######',
    '##############r....######',
    '#########################',
    '#########################',
  ],
  encounters: [
    {
      steps: 18,
      formations: [
        { weight: 2, enemies: ['boneknight'] },
        { weight: 2, enemies: ['wisp', 'wisp'] },
        { weight: 2, enemies: ['golem'] },
        { weight: 1, enemies: ['boneknight', 'wisp'] },
        { weight: 1, enemies: ['magmajelly', 'magmajelly', 'bat'] },
      ],
      // The lair itself is quiet.
      region: { x0: 0, y0: 9, x1: 24, y1: 17 },
    },
    {
      steps: 18,
      region: { x0: 0, y0: 0, x1: 10, y1: 8 },
      formations: [
        { weight: 1, enemies: ['boneknight'] },
        { weight: 1, enemies: ['wisp', 'bat'] },
      ],
    },
  ],
  warps: [{ x: 3, y: 2, to: 'cave1', tx: 14, ty: 3, facing: 'down', sfx: 'stairs' }],
  chests: [
    { id: 'b2_elixir', x: 2, y: 3, item: 'elixir' },
    { id: 'b2_sagerobe', x: 2, y: 14, item: 'sage_robe' },
    { id: 'b2_runeblade', x: 18, y: 15, item: 'runeblade' },
    { id: 'b2_hipotion', x: 11, y: 14, item: 'hipotion', qty: 2 },
  ],
  objects: [
    { id: 'b2_save', x: 18, y: 11, kind: 'save_crystal', talk: saveCrystal },
    { id: 'heartstone', x: 17, y: 3, kind: 'heartstone' },
    { id: 'wyrm', x: 17, y: 6, kind: 'monster', art: 'wyrm', visible: (st) => !st.hasFlag('wyrm_defeated') },
  ],
  npcs: [{ id: 'spirit', sprite: 'spirit', x: 17, y: 5, facing: 'down', visible: () => false }],
  triggers: [
    {
      id: 'wyrm_fight',
      x: 16,
      y: 8,
      when: (st) => !st.hasFlag('wyrm_defeated'),
      run: async (s) => {
        s.face('player', 'up');
        s.playMusic(null);
        await s.wait(600);
        s.shake(2, 1200);
        s.sfx('bossDie');
        await s.wait(1200);
        await s.say('So... the little sparks have come to be snuffed out.', '???');
        await s.say(
          'For a thousand years I slept beneath this stone, starving in the dark. Now its light is MINE. Every last drop.',
          'Umbral Wyrm',
        );
        await s.say('That light belongs to everyone on Lumen! Give it back!', 'Lyra');
        await s.say('Oh, I do love a monologue. Can we skip to the part where it bursts into flames?', 'Orrin');
        await s.say('Together, everyone. For Willowmere!', 'Kael');
        const won = await s.battle(['wyrm'], { boss: true, background: 'lair' });
        if (!won) return;
        s.state.setFlag('wyrm_defeated');
        s.playMusic('title');
        await s.wait(400);
        await s.say('The Umbral Wyrm dissolves into drifting shadow...');
        s.sfx('revive');
        await s.flash('#ffffff', 900);
        s.state.setFlag('heartstone_restored');
        await s.wait(600);
        s.showNpc('spirit');
        s.sfx('heal');
        await s.say('Children of Lumen... you have set me free.', 'Heartstone Spirit');
        await s.say(
          'My light returns to the isle. The fields will bloom, the seas will calm, and the long nights will end.',
          'Heartstone Spirit',
        );
        await s.say('Thank you, brave ones. Now go home. You are awaited.', 'Heartstone Spirit');
        await s.ending();
      },
    },
  ],
};
