import type { SongDef } from '../song';
import { bars, rhythm } from './util';

// "The Hollow King" — C minor, 144 bpm. Organ, pounding octave bass, timpani and brass; a
// choir section in the middle, then a heavy Neapolitan (Db) riff. 2-bar intro + 32-bar loop:
//
//   A : | Cm | Cm | Ab | G  | Cm | Cm   | Db | G  |
//   A': | Cm | Cm | Ab | Fm | Db | G7/B | Cm | G  |
//   B : | Fm | Cm | Fm | Cm | Ab | Bb   | G  | G  |   (choir, half-time)
//   C : | Cm | Db | Cm | Db | Ab | G    | Ab | G  |

const A1 = 'Cm Cm Ab G Cm Cm Db Gturn';
const A2 = 'Cm Cm Ab Fm Db G7/B Cm Gturn';
const B = 'Fm Cm Fm Cm Ab Bb G Gturn';
const C = 'Cm Db Cm Db Ab G Ab Gturn';

const octaves = (low: string, high: string): string => `${low}:8 ${low} ${high} ${low} ${low} ${high} ${low} ${high}`;
const POUND: Record<string, string> = {
  Cm: octaves('C2', 'C3'),
  Ab: octaves('Ab1', 'Ab2'),
  G: octaves('G1', 'G2'),
  Db: octaves('Db2', 'Db3'),
  Fm: octaves('F2', 'F3'),
  'G7/B': octaves('B1', 'B2'),
  // Turnaround: chromatic climb back to C.
  Gturn: 'G1:8 G1 G2 G1 G1 G2 Ab1 B1',
};
const HELD: Record<string, string> = { Fm: 'F2:1', Cm: 'C2:1', Ab: 'Ab1:1', Bb: 'Bb1:1', G: 'G1:1', Gturn: POUND.Gturn };

const VOICINGS: Record<string, string> = {
  Cm: 'C4+Eb4+G4',
  Ab: 'C4+Eb4+Ab4',
  G: 'B3+D4+G4',
  Gturn: 'B3+D4+G4',
  Db: 'Db4+F4+Ab4',
  Fm: 'C4+F4+Ab4',
  'G7/B': 'B3+D4+F4',
  Bb: 'Bb3+D4+F4',
};
const PAD = rhythm(VOICINGS, (v) => `${v}:1`);

const roll = (note: string, length: '2' | '1'): string =>
  length === '2'
    ? `v50 ${note}:16 ${note} v65 ${note} ${note} v80 ${note} ${note} v100 ${note} ${note}`
    : `v40 ${note}:16 ${note} ${note} ${note} v55 ${note} ${note} ${note} ${note} v70 ${note} ${note} ${note} ${note} v90 ${note} ${note} ${note} ${note}`;
const hit = (note: string): string => `v100 ${note}:4 r:4 r:2`;
const TIMPANI_A: Record<string, string> = {
  Cm: hit('C2'),
  Ab: hit('Ab2'),
  G: hit('G2'),
  Db: hit('Db2'),
  Fm: hit('F2'),
  'G7/B': hit('G2'),
  Gturn: `v100 G2:4 r:4 ${roll('G2', '2')}`,
};
const TIMPANI_B: Record<string, string> = {
  Fm: 'v75 F2:1',
  Cm: 'v75 C2:1',
  Ab: 'v75 Ab2:1',
  Bb: 'v75 Bb2:1',
  G: 'v85 G2:1',
  Gturn: roll('G2', '1'),
};
const drive = (note: string): string => `v100 ${note}:8 ${note} r:4 ${note}:8 ${note} r:4`;
const TIMPANI_C: Record<string, string> = {
  Cm: drive('C2'),
  Db: drive('Db2'),
  Ab: drive('Ab2'),
  G: drive('G2'),
  Gturn: `v100 G2:4 r:4 ${roll('G2', '2')}`,
};

const HEAVY = 'k:8 k:8 s:8 k:8 k:8 k:8 s:8 k:16 k:16';
const HEAVY_FILL = 'k:8 k:8 s:8 k:8 s:16 s s s m:16 m t t';
const HALF = 'k:4 h:8 h:8 s:4 h:8 h:8';
const HALF_FILL = 'k:8 k:8 s:16 s s s s:16 s s s m:16 t t t';

export const boss: SongDef = {
  title: 'The Hollow King',
  bpm: 144,
  key: 'C minor',
  chromatic: 'B Db',
  loop: true,
  channels: [
    {
      name: 'melody',
      instrument: 'brass',
      role: 'melody',
      volume: 0.85,
      pan: 0.1,
      reverb: 0.3,
      echo: 0.12,
      intro: '| r:1 | r:1 |',
      body: `
        | G5:2. Ab5:8 G5:8 | Eb5:2. D5:8 C5:8 | C5:4. Eb5:8 Ab5:2        | B4:2 D5:4 G5:4
        | G5:2. Ab5:8 G5:8 | C6:2. Bb5:8 Ab5:8 | Ab5:4. F5:8 Db5:2       | G5:4. F5:8 D5:4 B4:4
        | G5:2. Ab5:8 G5:8 | Eb5:2. D5:8 C5:8 | C5:4. Eb5:8 Ab5:4 C6:4   | Ab5:4. G5:8 F5:2
        | F5:4. Ab5:8 Db6:2 | D6:4. B5:8 F5:2 | Eb5:2 C5:2               | D5:4. Eb5:8 D5:4 B4:4
        | C5:1 | Eb5:2 G5:2 | Ab5:2. G5:8 F5:8 | G5:1 | Ab5:2 C6:2 | Bb5:2 D6:2 | B5:1 | D6:2 B5:4 G5:4
        | G5:4. Ab5:8 G5:4 Eb5:4 | F5:4. Ab5:8 F5:4 Db5:4 | G5:4. Ab5:8 G5:4 C6:4 | Db6:4. C6:8 Ab5:4 F5:4
        | Eb5:4 Ab5:4 C6:4 Eb6:4 | D6:2. B5:4            | C6:4. Bb5:8 Ab5:4 Eb5:4 | B5:2 G5:4 D5:4 |`,
    },
    {
      name: 'pad',
      instrument: 'organ',
      volume: 0.45,
      pan: -0.25,
      reverb: 0.45,
      intro: '| C4+Eb4+G4:4 r:4 r:2 | Db4+F4+Ab4:4 r:4 B3+D4+G4:2 |',
      body: `${bars(`${A1} ${A2}`, PAD)} @choir ${bars(B, PAD)} @organ ${bars(C, PAD)}`,
    },
    {
      name: 'bass',
      instrument: 'bass',
      role: 'bass',
      volume: 0.75,
      reverb: 0.05,
      intro: '| C2:4 r:4 r:2 | Db2:4 r:4 G1:2 |',
      body: `${bars(`${A1} ${A2}`, POUND)} ${bars(B, HELD)} ${bars(C, POUND)}`,
    },
    {
      name: 'timpani',
      instrument: 'timpani',
      volume: 0.65,
      reverb: 0.3,
      intro: `| v100 C2:4 r:4 r:2 | Db2:4 r:4 ${roll('G2', '2')} |`,
      body: `${bars(`${A1} ${A2}`, TIMPANI_A)} ${bars(B, TIMPANI_B)} ${bars(C, TIMPANI_C)}`,
    },
    {
      name: 'drums',
      instrument: 'drums',
      volume: 0.7,
      reverb: 0.12,
      intro: '| c+k:4 r:4 r:2 | c+k:4 r:4 s:16 s s s s s s s |',
      body: `
        ( | c+${HEAVY} ( | ${HEAVY} )x6 | ${HEAVY_FILL} )x2
        | c+${HALF} ( | ${HALF} )x6 | ${HALF_FILL}
        | c+${HEAVY} ( | ${HEAVY} )x6 | ${HEAVY_FILL} |`,
    },
  ],
};
