import type { SongDef } from '../song';
import { bars } from './util';

// "Spoils of Battle" — C major, 132 bpm. A 2-bar brass fanfare (a quick rising pickup into
// F, then a ringing, syncopated top C over a harp glissando), then a relaxed 16-bar loop:
//
//   | C | Am | F | G | C  | Am  | Dm7   | G7 |
//   | C | Am | F | G | F  | Em7 | Dm7 G7 | C  |

const PROGRESSION = 'C Am F G C Am Dm7 G7 C Am F G F Em7 Dm7-G7 C';

const HARP: Record<string, string> = {
  C: 'C3:8 G3 C4 E4 G4 E4 C4 G3',
  Am: 'A2:8 E3 A3 C4 E4 C4 A3 E3',
  F: 'F2:8 C3 F3 A3 C4 A3 F3 C3',
  G: 'G2:8 D3 G3 B3 D4 B3 G3 D3',
  Dm7: 'D3:8 A3 C4 F4 A4 F4 C4 A3',
  G7: 'G2:8 D3 F3 B3 D4 B3 F3 D3',
  Em7: 'E3:8 B3 D4 G4 B4 G4 D4 B3',
  'Dm7-G7': 'D3:8 A3 C4 F4 G2 D3 F3 B3',
};
const PAD: Record<string, string> = {
  C: 'C4+E4+G4:1',
  Am: 'C4+E4+A4:1',
  F: 'C4+F4+A4:1',
  G: 'D4+G4+B4:1',
  Dm7: 'D4+F4+C5:1',
  G7: 'D4+F4+B4:1',
  Em7: 'D4+G4+B4:1',
  'Dm7-G7': 'D4+F4+C5:2 D4+F4+B4:2',
};
const BASS: Record<string, string> = {
  C: 'C3:2 G2:2',
  Am: 'A2:2 E2:2',
  F: 'F2:2 C3:2',
  G: 'G2:2 D2:2',
  Dm7: 'D2:2 A2:2',
  G7: 'G2:2 F2:2',
  Em7: 'E2:2 B2:2',
  'Dm7-G7': 'D2:2 G2:2',
};

const FANFARE_CHORD = 'E4+G4+C5';

export const victory: SongDef = {
  title: 'Spoils of Battle',
  bpm: 132,
  key: 'C major',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'brass',
      role: 'melody',
      volume: 0.9,
      reverb: 0.3,
      echo: 0.15,
      intro: '| G4:16 C5 E5:8 G5 E5 F5:4 A5:4 | G5:8 C6 r:8 C6 C6:2 |',
      body: `
        @flute
        | E5:4. D5:8 C5:4 G4:4 | A4:4. C5:8 E5:2    | F5:4. E5:8 D5:4 C5:4 | D5:2. r:4
        | E5:4. G5:8 C6:4 G5:4 | A5:4. G5:8 E5:4 C5:4 | D5:4 F5:4 A5:4 C6:4 | B5:2 G5:4 r:4
        | E5:4. D5:8 C5:4 G4:4 | A4:4. C5:8 E5:4 A5:4 | A5:4. G5:8 F5:4 C5:4 | B4:4 D5:4 G5:2
        | A5:4. G5:8 F5:4 A5:4 | G5:4. F5:8 E5:4 D5:4 | F5:4 A5:4 G5:4 F5:4 | E5:2. r:4 |`,
    },
    {
      name: 'horns',
      instrument: 'brass',
      volume: 0.55,
      pan: -0.3,
      reverb: 0.3,
      intro: `
        | r:4 ${FANFARE_CHORD}:4 F4+A4+C5:4 F4+A4+C5:4
        | ${FANFARE_CHORD}:8 ${FANFARE_CHORD} r:8 ${FANFARE_CHORD} ${FANFARE_CHORD}:2 |`,
      body: '( | r:1 )x16 |',
    },
    {
      name: 'harp',
      instrument: 'harp',
      volume: 0.5,
      pan: 0.3,
      reverb: 0.35,
      intro: '| r:1 | r:2 C4:32 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6 D6 |',
      body: bars(PROGRESSION, HARP),
    },
    {
      name: 'strings',
      instrument: 'strings',
      volume: 0.4,
      pan: -0.2,
      reverb: 0.4,
      intro: '| C4+E4+G4:2 C4+F4+A4:2 | C4+E4+G4:1 |',
      body: bars(PROGRESSION, PAD),
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.6,
      reverb: 0.1,
      intro: '| C3:4 C3 F2 F2 | C3:8 C3 r:8 C2 C2:2 |',
      body: bars(PROGRESSION, BASS),
    },
    {
      name: 'timpani',
      instrument: 'timpani',
      volume: 0.6,
      reverb: 0.3,
      intro: '| v100 C2:4 r:4 F2:4 r:4 | C2:8 C2 r:8 C2 v40 C2:16 v55 C2 v70 C2 v85 C2 v100 C2:4 |',
      body: '( | r:1 )x16 |',
    },
    {
      name: 'drums',
      instrument: 'drums',
      volume: 0.55,
      reverb: 0.15,
      intro: '| c+k:4 s:4 k:4 s:4 | k:8 k:8 r:8 k:8 s:16 s s s c+k:4 |',
      body: '( | v60 k:4 v40 h:8 h:8 v50 s:4 v40 h:8 h:8 )x16 |',
    },
  ],
};
