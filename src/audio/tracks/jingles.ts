import type { SongDef } from '../song';

// Short non-looping jingles (1-4 s).

/** Inn: a two-bar lullaby cadence, F - C7 - F. */
export const inn: SongDef = {
  title: 'A Night at the Inn',
  bpm: 100,
  meter: [3, 4],
  key: 'F major',
  loop: false,
  channels: [
    { name: 'melody', instrument: 'celesta', role: 'melody', reverb: 0.45, echo: 0.2, body: '| A5:4 F5:4 E5:4 | F5:2. |' },
    { name: 'harp', instrument: 'harp', volume: 0.55, pan: -0.3, reverb: 0.4, body: '| F3:8 C4 F4 A4 C3 Bb3 | F3 C4 F4 A4 C5:4 |' },
    { name: 'strings', instrument: 'strings', volume: 0.45, reverb: 0.45, body: '| C4+F4+A4:2 C4+E4+Bb4:4 | C4+F4+A4:2. |' },
    { name: 'bass', instrument: 'bass', role: 'bass', volume: 0.5, body: '| F2:2 C2:4 | F2:2. |' },
  ],
};

/** Item: a sparkling turn that leaps up to a high C. */
export const item: SongDef = {
  title: 'Treasure!',
  bpm: 150,
  key: 'C major',
  loop: false,
  channels: [
    { name: 'melody', instrument: 'celesta', role: 'melody', reverb: 0.4, echo: 0.2, body: '| E6:16 C6 G5 C6 E6:8 G6 C7:4 r:4 |' },
    { name: 'harp', instrument: 'harp', volume: 0.6, reverb: 0.4, body: '| C4+E4+G4:4 r:4 C4+G4+C5+E5:4 r:4 |' },
    { name: 'bass', instrument: 'bass', role: 'bass', volume: 0.5, body: '| C3:4 r:4 C2:4 r:4 |' },
  ],
};

/** Level up: brass triplet runs climbing through C and F, landing on a bright C chord. */
export const levelup: SongDef = {
  title: 'Stronger',
  bpm: 144,
  key: 'C major',
  loop: false,
  channels: [
    {
      name: 'melody',
      instrument: 'brass',
      role: 'melody',
      reverb: 0.3,
      echo: 0.15,
      body: '| C5:8t E5 G5 A5:4 F5:8t A5 C6 D6:4 | E6:2. r:4 |',
    },
    { name: 'strings', instrument: 'strings', volume: 0.5, reverb: 0.4, body: '| C4+E4+G4:2 F4+A4+C5:2 | E4+G4+C5:2. r:4 |' },
    { name: 'bass', instrument: 'bass', role: 'bass', volume: 0.6, body: '| C3:2 F2:2 | C2:2. r:4 |' },
    { name: 'drums', instrument: 'drums', volume: 0.6, reverb: 0.15, body: '| k:4 s:4 k:4 s:4 | c+k:2. r:4 |' },
  ],
};

/** Save: a quick sparkling G major arpeggio ringing up to a high B. */
export const save: SongDef = {
  title: 'Memory Crystal',
  bpm: 120,
  key: 'G major',
  loop: false,
  channels: [
    {
      name: 'melody',
      instrument: 'celesta',
      role: 'melody',
      reverb: 0.5,
      echo: 0.3,
      body: '| G5:16 B5 D6 G6 D6 B5 G6 B6:4. r:8. |',
    },
    { name: 'bell', instrument: 'bell', volume: 0.4, reverb: 0.5, echo: 0.3, body: '| r:2 D6:2 |' },
    { name: 'harp', instrument: 'harp', volume: 0.55, reverb: 0.4, body: '| G3+B3+D4+G4:2 r:2 |' },
    { name: 'bass', instrument: 'bass', role: 'bass', volume: 0.45, body: '| G2:2 r:2 |' },
  ],
};
