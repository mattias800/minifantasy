// Names of the synth instruments and drum sounds. Kept free of any Web Audio code so the
// notation parser and the tests can use them in Node.

/** Every instrument in the synth palette (implemented in instruments.ts). */
export const INSTRUMENT_IDS = [
  'harp', // soft plucked harp, for arpeggios
  'pluck', // short guitar/lute pluck, for chords and ostinatos
  'strings', // detuned-saw string pad, slow attack
  'flute', // sine/triangle flute with breath chiff and delayed vibrato
  'brass', // filtered saws with a filter "blat", for leads and stabs
  'lead', // square/saw synth lead with vibrato
  'bass', // warm triangle/square bass
  'organ', // additive pipe organ
  'choir', // formant-filtered "aah" pad
  'bell', // inharmonic FM bell
  'celesta', // bright harmonic FM celesta
  'timpani', // pitched kettle drum
  'drums', // unpitched kit; notes are drum ids instead of pitches
] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

/**
 * Drum sounds, written as lowercase letters in 'drums' channels:
 * k = kick, s = snare, h = closed hat, o = open hat, c = crash, t = low tom, m = mid tom.
 */
export const DRUM_IDS = ['k', 's', 'h', 'o', 'c', 't', 'm'] as const;
export type DrumId = (typeof DRUM_IDS)[number];

export function isInstrumentId(s: string): s is InstrumentId {
  return (INSTRUMENT_IDS as readonly string[]).includes(s);
}

export function isDrumId(s: string): s is DrumId {
  return (DRUM_IDS as readonly string[]).includes(s);
}
