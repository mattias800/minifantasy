import type { SongDef } from '../song';
import { bars } from './util';

// "Across the Wide World" — G major, 120 bpm march. 24-bar loop (A A' B):
//
//   A : | G  | G  | C  | D  | Em | C  | Am D | G |
//   A': | G  | G  | C  | D  | Em | Bm | C  D | G |
//   B : | C  | D  | Bm | Em | Am | D  | F    | D |   (F = heroic borrowed bVII)

// Split bars (two chords, half a bar each) are written 'Am-D'.
const PROGRESSION = 'G G C D Em C Am-D G  G G C D Em Bm C-D G  C D Bm Em Am D F D';

const PAD: Record<string, string> = {
  G: 'D4+G4+B4:1',
  C: 'C4+E4+G4:1',
  D: 'D4+F#4+A4:1',
  Em: 'E4+G4+B4:1',
  Bm: 'D4+F#4+B4:1',
  Am: 'C4+E4+A4:1',
  F: 'C4+F4+A4:1',
  'Am-D': 'C4+E4+A4:2 D4+F#4+A4:2',
  'C-D': 'C4+E4+G4:2 D4+F#4+A4:2',
};
const PLUCK: Record<string, string> = {
  G: 'G3:8 B3 D4 B3 G3 B3 D4 B3',
  C: 'G3:8 C4 E4 C4 G3 C4 E4 C4',
  D: 'A3:8 D4 F#4 D4 A3 D4 F#4 D4',
  Em: 'G3:8 B3 E4 B3 G3 B3 E4 B3',
  Bm: 'F#3:8 B3 D4 B3 F#3 B3 D4 B3',
  Am: 'A3:8 C4 E4 C4 A3 C4 E4 C4',
  F: 'A3:8 C4 F4 C4 A3 C4 F4 C4',
  'Am-D': 'A3:8 C4 E4 C4 A3 D4 F#4 D4',
  'C-D': 'G3:8 C4 E4 C4 A3 D4 F#4 D4',
};
const BASS: Record<string, string> = {
  G: 'G2:4 D2 G2 D2',
  C: 'C3:4 G2 C3 G2',
  D: 'D2:4 A2 D2 A2',
  Em: 'E2:4 B2 E2 B2',
  Bm: 'B1:4 F#2 B1 F#2',
  Am: 'A2:4 E2 A2 E2',
  F: 'F2:4 C3 F2 C3',
  'Am-D': 'A2:4 E2 D2 A2',
  'C-D': 'C3:4 G2 D2 A2',
};

const MARCH = 'k:8 h:8 s:8 h:8 k:8 k:8 s:8 s:16 s:16';
const FILL = 'k:8 h:8 s:8 h:8 s:16 s s s m:8 t:8';

export const overworld: SongDef = {
  title: 'Across the Wide World',
  bpm: 120,
  key: 'G major',
  chromatic: 'F',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'brass',
      role: 'melody',
      volume: 1,
      reverb: 0.25,
      echo: 0.12,
      body: `
        | G4:8. D4:16 G4:8. B4:16 D5:4 B4:4  | D5:8. C5:16 B4:8 A4:8 B4:4 G4:4 | E5:4. D5:8 C5:4 E5:4           | D5:2 A4:8. B4:16 C5:8. A4:16
        | B4:4. E5:8 G5:4 E5:4               | G5:8. F#5:16 E5:8 D5:8 E5:4 C5:4 | C5:4 A4:4 D5:8. E5:16 F#5:8 A5:8 | G5:2. r:4
        | G4:8. D4:16 G4:8. B4:16 D5:4 B4:4  | D5:8. C5:16 B4:8 A4:8 B4:4 G4:4 | E5:4. F#5:8 G5:4 E5:4          | A5:2 F#5:4 D5:4
        | G5:4. F#5:8 E5:4 B4:4              | F#5:4. E5:8 D5:4 B4:4            | C5:8. D5:16 E5:8 G5:8 F#5:4 A5:4 | G5:2 D5:4 B4:4
        | G4:4. C5:8 E5:2                    | F#5:4. E5:8 D5:2                 | D5:4. F#5:8 B5:2               | G5:4. F#5:8 E5:2
        | C5:4. E5:8 A5:2                    | F#5:4. G5:8 A5:4 D5:4            | C5:4. D5:8 F5:4 A5:4           | A5:4 F#5:4 D5:4 A4:4 |`,
    },
    {
      name: 'strings',
      instrument: 'strings',
      volume: 0.45,
      pan: 0.3,
      reverb: 0.35,
      body: bars(PROGRESSION, PAD),
    },
    {
      name: 'pluck',
      instrument: 'pluck',
      volume: 0.5,
      pan: -0.35,
      reverb: 0.2,
      echo: 0.1,
      body: bars(PROGRESSION, PLUCK),
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.7,
      reverb: 0.1,
      body: bars(PROGRESSION, BASS),
    },
    {
      name: 'drums',
      instrument: 'drums',
      volume: 0.6,
      reverb: 0.12,
      body: `( | c+${MARCH} ( | ${MARCH} )x6 | ${FILL} )x3 |`,
    },
  ],
};
