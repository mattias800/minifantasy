import type { SongDef } from '../song';

// "Embers" — A minor, 60 bpm. A 4-bar sighing flute motif over strings, then the motif's
// outline drifts quietly on celesta and harp in an 8-bar loop.
//
//   | Am | F | Dm | E |   (x3: intro, then twice per loop)

export const gameover: SongDef = {
  title: 'Embers',
  bpm: 60,
  key: 'A minor',
  chromatic: 'G#',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'flute',
      role: 'melody',
      volume: 0.85,
      reverb: 0.45,
      echo: 0.25,
      intro: '| E5:2. D5:8 C5:8 | C5:2 A4:2 | D5:4. E5:8 F5:4 A5:4 | B4:2 G#4:2 |',
      body: `
        @celesta v70
        | r:2 E5:4 C5:4 | A4:1 | r:2 F5:4 D5:4 | B4:1
        | r:2 C5:4 E5:4 | A5:2 F5:2 | F5:2 D5:2 | E5:2 G#4:2 |`,
    },
    {
      name: 'harp',
      instrument: 'harp',
      volume: 0.45,
      pan: -0.3,
      reverb: 0.4,
      echo: 0.2,
      intro: '| r:1 | r:1 | r:1 | r:1 |',
      body: `( v70
        | A2:8 E3 A3 C4 E4 C4 A3 E3 | F2 C3 F3 A3 C4 A3 F3 C3
        | D3 A3 D4 F4 A4 F4 D4 A3   | E2 B2 E3 G#3 B3 G#3 E3 B2 )x2 |`,
    },
    {
      name: 'strings',
      instrument: 'strings',
      volume: 0.5,
      pan: 0.25,
      reverb: 0.45,
      intro: '| C4+E4+A4:1 | C4+F4+A4:1 | D4+F4+A4:1 | B3+E4+G#4:1 |',
      body: '( v60 | C4+E4+A4:1 | C4+F4+A4:1 | D4+F4+A4:1 | B3+E4+G#4:1 )x2 |',
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.5,
      reverb: 0.2,
      intro: '| A2:1 | F2:1 | D2:1 | E2:1 |',
      body: '( v70 | A2:1 | F2:1 | D2:1 | E2:1 )x2 |',
    },
  ],
};
