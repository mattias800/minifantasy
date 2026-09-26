import type { SongDef } from '../song';

// "Hearthside" — F major, 3/4 at 100 bpm. A gentle waltz: flute tune over lute "oom-pah-pah",
// celesta answering the long notes. 32-bar loop (A A' B A'):
//
//   A : | F  | C/E | Dm | Bb | F  | Gm7 | C7 | F  |
//   A': | F  | C/E | Dm | Bb | Gm | C   | F  | F  |
//   B : | Bb | C   | Am | Dm | Gm | C   | Bb | C7 |

const A2_MELODY = `
  | A5:2 G5:8 F5:8 | G5:2 C6:4 | A5:4. G5:8 F5:4 | D5:4 F5:4 Bb5:4 | Bb5:4. A5:8 G5:4 | E5:4 D5:8 E5:8 G5:4`;
const A2_CHORDS = `
  | r:4 A3+C4+F4:4 A3+C4+F4:4 | r:4 G3+C4+E4:4 G3+C4+E4:4 | r:4 A3+D4+F4:4 A3+D4+F4:4 | r:4 Bb3+D4+F4:4 Bb3+D4+F4:4
  | r:4 G3+Bb3+D4:4 G3+Bb3+D4:4 | r:4 G3+C4+E4:4 G3+C4+E4:4 | r:4 A3+C4+F4:4 A3+C4+F4:4 | r:4 A3+C4+F4:4 A3+C4+F4:4`;
const A2_BASS = '| F2:2 C3:4 | E2:2 C3:4 | D2:2 A2:4 | Bb1:2 F2:4 | G2:2 D2:4 | C3:2 G2:4 | F2:2 C3:4';

export const town: SongDef = {
  title: 'Hearthside',
  bpm: 100,
  meter: [3, 4],
  key: 'F major',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'flute',
      role: 'melody',
      volume: 0.9,
      pan: 0.1,
      reverb: 0.3,
      echo: 0.12,
      body: `
        | A5:2 G5:8 F5:8 | G5:2 C5:4 | F5:4. E5:8 D5:4 | D5:2. | C5:4 F5:4 A5:4 | Bb5:4. A5:8 G5:4 | E5:4 G5:4 Bb5:4 | A5:2.
        ${A2_MELODY} | F5:2. | r:4 A4:4 C5:4
        | D5:2 F5:4 | E5:2 G5:4 | A5:4. G5:8 E5:4 | F5:2 D5:4 | Bb5:4 A5:4 G5:4 | G5:4. F5:8 E5:4 | D5:4. C5:8 Bb4:4 | C5:4 E5:4 G5:4
        ${A2_MELODY} | F5:2. | _:2 r:4 |`,
    },
    {
      name: 'lute',
      instrument: 'pluck',
      volume: 0.55,
      pan: -0.3,
      reverb: 0.2,
      body: `
        | r:4 A3+C4+F4:4 A3+C4+F4:4 | r:4 G3+C4+E4:4 G3+C4+E4:4 | r:4 A3+D4+F4:4 A3+D4+F4:4 | r:4 Bb3+D4+F4:4 Bb3+D4+F4:4
        | r:4 A3+C4+F4:4 A3+C4+F4:4 | r:4 Bb3+D4+F4:4 Bb3+D4+F4:4 | r:4 G3+Bb3+E4:4 G3+Bb3+E4:4 | r:4 A3+C4+F4:4 A3+C4+F4:4
        ${A2_CHORDS}
        | r:4 Bb3+D4+F4:4 Bb3+D4+F4:4 | r:4 G3+C4+E4:4 G3+C4+E4:4 | r:4 A3+C4+E4:4 A3+C4+E4:4 | r:4 A3+D4+F4:4 A3+D4+F4:4
        | r:4 G3+Bb3+D4:4 G3+Bb3+D4:4 | r:4 G3+C4+E4:4 G3+C4+E4:4 | r:4 Bb3+D4+F4:4 Bb3+D4+F4:4 | r:4 G3+Bb3+E4:4 G3+Bb3+E4:4
        ${A2_CHORDS} |`,
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.65,
      reverb: 0.1,
      body: `
        | F2:2 C3:4 | E2:2 C3:4 | D2:2 A2:4 | Bb1:2 F2:4 | F2:2 C3:4 | G2:2 D2:4 | C3:2 G2:4 | F2:2 C3:4
        ${A2_BASS} | F2:2 A2:4
        | Bb1:2 F2:4 | C3:2 G2:4 | A2:2 E2:4 | D2:2 A2:4 | G2:2 D2:4 | C3:2 G2:4 | Bb1:2 F2:4 | C3:2 G2:4
        ${A2_BASS} | F2:2 C3:4 |`,
    },
    {
      name: 'celesta',
      instrument: 'celesta',
      volume: 0.45,
      pan: 0.35,
      reverb: 0.4,
      echo: 0.25,
      body: `
        | r:2. | r:2. | r:2. | r:4 F5:8 Bb5:8 D6:4 | r:2. | r:2. | r:2. | r:4 C6:8 A5:8 F5:4
        | r:2. | r:2. | r:2. | r:2. | r:2. | r:2. | r:4 A5:8 C6:8 F6:4 | r:2.
        ( | r:2. )x8
        | r:2. | r:2. | r:2. | r:2. | r:2. | r:2. | r:4 A5:8 C6:8 F6:4 | C6:8 A5:8 F5:4 r:4 |`,
    },
    {
      name: 'strings',
      instrument: 'strings',
      volume: 0.35,
      pan: 0.2,
      reverb: 0.4,
      body: `
        ( | r:2. )x16
        | D4+F4+Bb4:2. | E4+G4+C5:2. | E4+A4+C5:2. | D4+F4+A4:2. | D4+G4+Bb4:2. | E4+G4+C5:2. | D4+F4+Bb4:2. | E4+G4+Bb4:2.
        ( | r:2. )x8 |`,
    },
    {
      name: 'shaker',
      instrument: 'drums',
      volume: 0.5,
      reverb: 0.15,
      body: '( | v80 k:8 v45 h v60 h v45 h v60 h v45 h )x32 |',
    },
  ],
};
