import type { SongDef } from '../song';
import { bars, rhythm } from './util';

// "Clash of Steel" — E minor, 152 bpm. Galloping bass ostinato, brass stabs, square lead.
// 2-bar intro, then a 32-bar loop; the B section switches the stabs to sustained strings and
// adds a 16th-note arpeggio to lift the energy before the loop returns.

const A1 = 'Em Em C D Em Em C B7';
const A2 = 'Em Em C D Am B7 Em Em';
const B = 'C D G Em Am D Bsus B7';
const C = 'Am Em Am B7 C D B7 B7';

/** Root, root, fifth, root, seventh/sixth, root, fifth, third — the same shape on every chord. */
const OSTINATO: Record<string, string> = {
  Em: 'E2:8 E2 B2 E2 D3 E2 B2 G2',
  C: 'C2:8 C2 G2 C2 A2 C2 G2 E2',
  D: 'D2:8 D2 A2 D2 C3 D2 A2 F#2',
  G: 'G1:8 G1 D2 G1 E2 G1 D2 B1',
  Am: 'A1:8 A1 E2 A1 G2 A1 E2 C2',
  B7: 'B1:8 B1 F#2 B1 A2 B1 F#2 D#2',
  Bsus: 'B1:8 B1 F#2 B1 A2 B1 F#2 E2',
};

const VOICINGS: Record<string, string> = {
  Em: 'E4+G4+B4',
  C: 'E4+G4+C5',
  D: 'D4+F#4+A4',
  G: 'D4+G4+B4',
  Am: 'E4+A4+C5',
  B7: 'D#4+F#4+A4',
  Bsus: 'E4+F#4+B4',
};
const STABS = rhythm(VOICINGS, (v) => `${v}:8 r:8 r:8 ${v}:8 r:8 ${v}:8 r:4`);
const SUSTAINED = rhythm(VOICINGS, (v) => `${v}:1`);

const ARPEGGIOS: Record<string, string> = {
  C: '( C4:16 E4 G4 E4 )x4',
  D: '( D4:16 F#4 A4 F#4 )x4',
  G: '( D4:16 G4 B4 G4 )x4',
  Em: '( E4:16 G4 B4 G4 )x4',
  Am: '( A3:16 C4 E4 C4 )x4',
  B7: '( B3:16 D#4 F#4 A4 )x4',
  Bsus: '( B3:16 E4 F#4 E4 )x4',
};

const GROOVE = 'k:8 h:8 s:8 h:8 k:8 k:8 s:8 h:8';
const FILL = 'k:8 h:8 s:8 h:8 s:16 s s s m:8 t:8';

export const battle: SongDef = {
  title: 'Clash of Steel',
  bpm: 152,
  key: 'E minor',
  chromatic: 'D#',
  loop: true,
  channels: [
    {
      name: 'lead',
      instrument: 'lead',
      role: 'melody',
      volume: 0.85,
      pan: 0.05,
      reverb: 0.2,
      echo: 0.15,
      intro: '| r:1 | r:1 |',
      body: `
        | E5:8 E5 B4 E5 G5:4 F#5:8 E5 | D5:4. E5:8 B4:2 | E5:8 E5 C5 E5 G5:4 A5:8 G5 | F#5:4. E5:8 D5:2
        | E5:8 E5 B4 E5 G5:4 B5:4     | B5:8 A5 G5 A5 B5:2 | C6:4. B5:8 A5:4 G5:4   | A5:4 F#5:4 D#5:4 B4:4
        | E5:8 E5 B4 E5 G5:4 F#5:8 E5 | D5:4. E5:8 B4:2 | E5:8 E5 C5 E5 G5:4 A5:8 G5 | A5:4. G5:8 F#5:4 D5:4
        | C6:4. B5:8 A5:4 E5:4        | D#5:4 F#5:4 A5:4 B5:4 | G5:4. F#5:8 E5:2  | r:2 B4:8 C5 D5 E5
        | G5:2. E5:4 | F#5:2. A5:4 | B5:2 G5:4 D5:4 | E5:2. G5:4 | A5:2. C6:4 | B5:4 A5:4 F#5:4 D5:4 | E5:2 F#5:2 | D#5:2 F#5:4 A5:4
        | E5:8 A5 r:8 A5 G5 A5 C6:4   | B5:4. G5:8 E5:4 B4:4 | E5:8 A5 r:8 A5 G5 A5 B5 C6 | B5:4. F#5:8 D#5:4 B4:4
        | C5:8 E5 G5 E5 C6:4 G5:4     | D5:8 F#5 A5 F#5 D6:4 A5:4 | B5:4 A5:4 F#5:4 D#5:4 | B4:8 D#5 F#5 A5 B5:4 r:4 |`,
    },
    {
      name: 'harmony',
      instrument: 'brass',
      volume: 0.45,
      pan: -0.25,
      reverb: 0.2,
      intro: `
        | E4+G4+B4:8 r:8 E4+G4+B4:8 r:8 E4+G4+C5:4 D4+F#4+A4:4
        | E4+G4+B4:8 r:8 E4+G4+B4:8 r:8 D4+F#4+A4:8 D4+F#4+A4:8 D#4+F#4+B4:4 |`,
      body: `${bars(`${A1} ${A2}`, STABS)} @strings ${bars(B, SUSTAINED)} @brass ${bars(C, STABS)}`,
    },
    {
      name: 'arpeggio',
      instrument: 'pluck',
      volume: 0.4,
      pan: 0.35,
      reverb: 0.2,
      echo: 0.2,
      intro: '| r:1 | r:1 |',
      body: `( | r:1 )x16 ${bars(`${B} ${C}`, ARPEGGIOS)}`,
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.75,
      reverb: 0.05,
      intro: '| E2:8 r:8 E2:8 r:8 C2:4 D2:4 | E2:8 r:8 E2:8 r:8 D2:8 D2:8 B1:4 |',
      body: bars(`${A1} ${A2} ${B} ${C}`, OSTINATO),
    },
    {
      name: 'drums',
      instrument: 'drums',
      volume: 0.75,
      reverb: 0.1,
      intro: '| c+k:8 r:8 k:8 r:8 s:4 s:4 | k:8 r:8 k:8 r:8 s:16 s s s s:8 s:8 |',
      body: `( | c+${GROOVE} ( | ${GROOVE} )x6 | ${FILL} )x4 |`,
    },
  ],
};
