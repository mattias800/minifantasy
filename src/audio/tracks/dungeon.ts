import type { SongDef } from '../song';

// "Echoes Below" — D minor, 72 bpm. Sparse celesta phrases that the echo completes, a hushed
// choir, and a low heartbeat. Eb (Phrygian bII) and C# (harmonic minor) add unease. 16-bar loop:
//
//   | Dm | Dm | Bb | A  | Dm | Eb | Dm | A |
//   | Gm | Dm | Gm | A  | Bb | Gm | Eb | A |

export const dungeon: SongDef = {
  title: 'Echoes Below',
  bpm: 72,
  key: 'D minor',
  chromatic: 'C# Eb',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'celesta',
      role: 'melody',
      volume: 1,
      pan: 0.15,
      reverb: 0.5,
      echo: 0.5,
      body: `
        | r:4 A4:4 D5:4 F5:4 | E5:2. r:4 | r:4 F4:4 Bb4:4 D5:4 | C#5:2. r:4
        | r:4 A4:4 D5:4 F5:4 | G5:2. r:4 | F5:4. E5:8 D5:2     | E5:1
        | D5:4. Bb4:8 G4:2   | A4:2. r:4 | Bb4:4. D5:8 G5:2    | A5:2 E5:2
        | F5:4. D5:8 Bb4:2   | D5:2 G5:4 Bb5:4 | G5:2 Bb5:4 G5:4 | A5:2 r:2 |`,
    },
    {
      name: 'choir',
      instrument: 'choir',
      volume: 0.35,
      pan: -0.2,
      reverb: 0.6,
      body: `
        | A3+D4+F4:1 | A3+D4+F4:1 | Bb3+D4+F4:1 | A3+C#4+E4:1 | A3+D4+F4:1 | Bb3+Eb4+G4:1 | A3+D4+F4:1 | A3+C#4+E4:1
        | Bb3+D4+G4:1 | A3+D4+F4:1 | Bb3+D4+G4:1 | A3+C#4+E4:1 | Bb3+D4+F4:1 | Bb3+D4+G4:1 | Bb3+Eb4+G4:1 | A3+C#4+E4:1 |`,
    },
    {
      name: 'harp',
      instrument: 'harp',
      volume: 0.35,
      pan: -0.4,
      reverb: 0.45,
      echo: 0.35,
      body: `
        | D3:8 A3 D4 r:8 r:2 | D3:8 A3 D4 r:8 r:2 | Bb2:8 F3 Bb3 r:8 r:2 | A2:8 E3 A3 r:8 r:2
        | D3:8 A3 D4 r:8 r:2 | Eb3:8 Bb3 Eb4 r:8 r:2 | D3:8 A3 D4 r:8 r:2 | A2:8 E3 A3 r:8 r:2
        | G2:8 D3 G3 r:8 r:2 | D3:8 A3 D4 r:8 r:2 | G2:8 D3 G3 r:8 r:2 | A2:8 E3 A3 r:8 r:2
        | Bb2:8 F3 Bb3 r:8 r:2 | G2:8 D3 G3 r:8 r:2 | Eb3:8 Bb3 Eb4 r:8 r:2 | A2:8 E3 A3 r:8 r:2 |`,
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.5,
      reverb: 0.3,
      body: `
        | D2:1 | D2:1 | Bb1:1 | A1:1 | D2:1 | Eb2:1 | D2:1 | A1:1
        | G1:1 | D2:1 | G1:1  | A1:1 | Bb1:1 | G1:1 | Eb2:1 | A1:1 |`,
    },
    {
      name: 'heartbeat',
      instrument: 'drums',
      volume: 0.5,
      reverb: 0.4,
      body: '( | v60 t:8 v40 t:8 r:4 r:2 | r:1 )x8 |',
    },
  ],
};
