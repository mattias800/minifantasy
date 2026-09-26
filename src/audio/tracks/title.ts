import type { SongDef } from '../song';

// "Fading Light" — D major, 76 bpm. Majestic but wistful: the borrowed G minor in bar 14
// is the world's light dimming. Form: 2-bar harp intro, then a 16-bar loop.
//
//   | D  | Bm | G  | A  | D/F# | G  | Em7 | A     |
//   | Bm | G  | D  | A  | G    | Gm | Em7 A7 | D  |
//
// The melody, harp and pad are exported so the ending can reprise them.

export const TITLE_MELODY = `
  | A4:4. D5:8 F#5:2        | E5:4. D5:8 B4:2          | G4:4 B4:8 D5:8 G5:4. F#5:8 | E5:2. r:4
  | F#5:4. G5:8 A5:4 F#5:4  | G5:4. F#5:8 E5:4 D5:4    | E5:4. D5:8 B4:4 D5:4       | C#5:4. B4:8 A4:2
  | D5:4 F#5:4 B5:2         | B5:4. A5:8 G5:4 D5:4     | A5:4. F#5:8 D5:4 F#5:4     | E5:4. F#5:8 E5:4 C#5:4
  | D5:4. G5:8 B5:2         | Bb5:4. A5:8 G5:4 D5:4    | G5:4. F#5:8 E5:4 C#5:4     | D5:1 |`;

export const TITLE_HARP = `
  | D3:8 A3 D4 F#4 A4 F#4 D4 A3   | B2 F#3 B3 D4 F#4 D4 B3 F#3   | G2 D3 G3 B3 D4 B3 G3 D3     | A2 E3 A3 C#4 E4 C#4 A3 E3
  | F#3 A3 D4 F#4 A4 F#4 D4 A3    | G2 D3 G3 B3 D4 B3 G3 D3      | E3 B3 D4 G4 B4 G4 D4 B3     | A2 E3 A3 C#4 E4 C#4 A3 E3
  | B2 F#3 B3 D4 F#4 D4 B3 F#3    | G2 D3 G3 B3 D4 B3 G3 D3      | D3 A3 D4 F#4 A4 F#4 D4 A3   | A2 E3 A3 C#4 E4 C#4 A3 E3
  | G2 D3 G3 B3 D4 B3 G3 D3       | G2 D3 G3 Bb3 D4 Bb3 G3 D3    | E3 B3 D4 G4 A2 E3 G3 C#4    | D3 A3 D4 F#4 A4 D5 A4 F#4 |`;

export const TITLE_PAD = `
  | D4+F#4+A4:1 | D4+F#4+B4:1 | D4+G4+B4:1 | C#4+E4+A4:1
  | D4+F#4+A4:1 | D4+G4+B4:1  | D4+E4+G4+B4:1 | D4+E4+A4:2 C#4+E4+A4:2
  | D4+F#4+B4:1 | D4+G4+B4:1  | D4+F#4+A4:1 | C#4+E4+A4:1
  | D4+G4+B4:1  | D4+G4+Bb4:1 | D4+E4+G4+B4:2 C#4+E4+G4+A4:2 | D4+F#4+A4:1 |`;

export const title: SongDef = {
  title: 'Fading Light',
  bpm: 76,
  key: 'D major',
  chromatic: 'Bb',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'flute',
      role: 'melody',
      volume: 0.9,
      reverb: 0.35,
      echo: 0.2,
      intro: '| r:1 | r:1 |',
      body: TITLE_MELODY,
    },
    {
      name: 'harp',
      instrument: 'harp',
      volume: 0.48,
      pan: -0.3,
      reverb: 0.35,
      echo: 0.1,
      intro: '| G2:8 D3 G3 B3 D4 B3 G3 D3 | A2 E3 A3 D4 A2 E3 A3 C#4 |',
      body: TITLE_HARP,
    },
    {
      name: 'strings',
      instrument: 'strings',
      volume: 0.55,
      pan: 0.25,
      reverb: 0.4,
      intro: '| D4+G4+B4:1 | D4+E4+A4:2 C#4+E4+A4:2 |',
      body: TITLE_PAD,
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.6,
      reverb: 0.1,
      intro: '| G1:2. D2:4 | A1:2. E2:4 |',
      body: `
        | D2:2. A2:4  | B1:2. F#2:4 | G1:2. D2:4 | A1:2. E2:4
        | F#2:2. A2:4 | G1:2. D2:4  | E2:2. B1:4 | A1:2. E2:4
        | B1:2. F#2:4 | G1:2. D2:4  | D2:2. A2:4 | A1:2. E2:4
        | G1:2. D2:4  | G1:2. D2:4  | E2:2 A1:2  | D2:1 |`,
    },
    {
      name: 'bells',
      instrument: 'bell',
      volume: 0.35,
      pan: 0.4,
      reverb: 0.5,
      echo: 0.3,
      intro: '| r:2 D6:4 B5:4 | r:2 E6:2 |',
      body: `
        | r:2 A5:2 | r:1 | r:1 | r:1 | r:2 D6:2  | r:1 | r:1 | r:1
        | r:2 F#6:2 | r:1 | r:1 | r:1 | r:2 D6:2 | r:1 | r:1 | r:1 |`,
    },
    {
      name: 'timpani',
      instrument: 'timpani',
      volume: 0.6,
      reverb: 0.3,
      intro: '| r:1 | r:2 v40 A2:16 A2 v55 A2 A2 v70 A2 A2 v85 A2 A2 |',
      body: `
        | v90 D2:4 r:4 r:2 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1
        | r:2 v40 A2:16 A2 v55 A2 A2 v70 A2 A2 v85 A2 A2
        | v90 F#2:4 r:4 r:2 | r:1 | r:1 | r:1 | v80 G2:4 r:4 r:2 | r:1 | r:1
        | r:2 v40 A2:16 A2 v55 A2 A2 v70 A2 A2 v85 A2 A2 |`,
    },
  ],
};
