import type { SongDef } from '../song';
import { TITLE_HARP, TITLE_MELODY, TITLE_PAD } from './title';
import { bars } from './util';

// "Dawn Returns" — D major, 84 bpm, 32-bar loop.
// Bars 1-16: the title theme, now triumphant on brass with march drums and timpani.
// Bars 17-32: a new, peaceful flute melody over harp; the title's borrowed G minor returns in
// bar 30, but this time it resolves home.
//
//   | G  | A  | F#m | Bm | Em  | A  | D      | D |
//   | G  | A  | F#m | Bm | Em7 | Gm | Asus4 A | D |

const PEACE = 'G A F#m Bm Em A D D G A F#m Bm Em7 Gm Asus Dend';

const HARP: Record<string, string> = {
  G: 'G2:8 D3 G3 B3 D4 B3 G3 D3',
  A: 'A2:8 E3 A3 C#4 E4 C#4 A3 E3',
  'F#m': 'F#2:8 C#3 F#3 A3 C#4 A3 F#3 C#3',
  Bm: 'B2:8 F#3 B3 D4 F#4 D4 B3 F#3',
  Em: 'E3:8 B3 E4 G4 B4 G4 E4 B3',
  D: 'D3:8 A3 D4 F#4 A4 F#4 D4 A3',
  Em7: 'E3:8 B3 D4 G4 B4 G4 D4 B3',
  Gm: 'G2:8 D3 G3 Bb3 D4 Bb3 G3 D3',
  Asus: 'A2:8 E3 A3 D4 A2 E3 A3 C#4',
  Dend: 'D3:8 A3 D4 F#4 A4 D5 A4 F#4',
};
const PAD: Record<string, string> = {
  G: 'D4+G4+B4:1',
  A: 'C#4+E4+A4:1',
  'F#m': 'C#4+F#4+A4:1',
  Bm: 'D4+F#4+B4:1',
  Em: 'E4+G4+B4:1',
  D: 'D4+F#4+A4:1',
  Em7: 'D4+E4+G4+B4:1',
  Gm: 'D4+G4+Bb4:1',
  Asus: 'D4+E4+A4:2 C#4+E4+A4:2',
  Dend: 'D4+F#4+A4:1',
};
const BASS: Record<string, string> = {
  G: 'G1:2 D2:2',
  A: 'A1:2 E2:2',
  'F#m': 'F#2:2 C#2:2',
  Bm: 'B1:2 F#2:2',
  Em: 'E2:2 B1:2',
  D: 'D2:2 A2:2',
  Em7: 'E2:2 B1:2',
  Gm: 'G1:2 D2:2',
  Asus: 'A1:1',
  Dend: 'D2:1',
};

const MARCH = 'k:4 h:8 h:8 s:4 h:8 h:8';
const ROLL = 'r:2 v40 A2:16 A2 v55 A2 A2 v70 A2 A2 v85 A2 A2';

export const ending: SongDef = {
  title: 'Dawn Returns',
  bpm: 84,
  key: 'D major',
  chromatic: 'Bb',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'brass',
      role: 'melody',
      volume: 0.85,
      reverb: 0.35,
      echo: 0.15,
      body: `${TITLE_MELODY} @flute
        | B4:4. D5:8 G5:2    | A5:4. G5:8 E5:2     | F#5:4. E5:8 C#5:2 | D5:2. B4:4
        | E5:4. F#5:8 G5:2   | A5:4. B5:8 C#6:2    | D6:2. A5:4        | F#5:2. r:4
        | G5:4. F#5:8 D5:2   | E5:4. F#5:8 A5:2    | C#6:4. B5:8 A5:2  | B5:2 F#5:2
        | G5:4. F#5:8 E5:4 D5:4 | Bb5:2 G5:4 D5:4 | E5:2 C#5:2        | D5:1 |`,
    },
    {
      name: 'harp',
      instrument: 'harp',
      volume: 0.4,
      pan: -0.3,
      reverb: 0.35,
      echo: 0.1,
      body: `${TITLE_HARP} ${bars(PEACE, HARP)}`,
    },
    {
      name: 'strings',
      instrument: 'strings',
      volume: 0.55,
      pan: 0.25,
      reverb: 0.4,
      body: `${TITLE_PAD} v75 ${bars(PEACE, PAD)}`,
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.65,
      reverb: 0.1,
      body: `
        | D2:4 A2 D3 A2  | B1 F#2 B2 F#2 | G1 D2 G2 D2 | A1 E2 A2 E2
        | F#2 A2 D3 A2   | G1 D2 G2 D2   | E2 B2 D3 B2 | A1 E2 A2 E2
        | B1 F#2 B2 F#2  | G1 D2 G2 D2   | D2 A2 D3 A2 | A1 E2 A2 E2
        | G1 D2 G2 D2    | G1 D2 G2 D2   | E2 B2 A2 C#3 | D2 A2 D3 A2
        ${bars(PEACE, BASS)}`,
    },
    {
      name: 'timpani',
      instrument: 'timpani',
      volume: 0.6,
      reverb: 0.3,
      body: `
        | v100 D2:4 r:4 r:2 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | ${ROLL}
        | v100 F#2:4 r:4 r:2 | r:1 | r:1 | r:1 | v90 G2:4 r:4 r:2 | r:1 | r:1 | ${ROLL}
        ( | r:1 )x16 |`,
    },
    {
      name: 'drums',
      instrument: 'drums',
      volume: 0.55,
      reverb: 0.15,
      body: `
        | c+${MARCH} ( | ${MARCH} )x6 | k:4 h:8 h:8 s:16 s s s s:8 s:8
        | c+${MARCH} ( | ${MARCH} )x6 | k:4 h:8 h:8 s:16 s s s s:8 s:8
        ( | r:1 )x16 |`,
    },
    {
      name: 'bells',
      instrument: 'bell',
      volume: 0.35,
      pan: 0.4,
      reverb: 0.5,
      echo: 0.3,
      body: `
        ( | r:1 )x16
        | r:2 D6:2 | r:1 | r:1 | r:1 | r:1 | r:1 | r:2 F#6:2 | r:1
        | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:2 A6:2 |`,
    },
  ],
};
