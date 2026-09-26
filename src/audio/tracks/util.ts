// Helpers for writing chord-driven parts (ostinatos, stabs, arpeggios) compactly.

/**
 * Builds a part with one bar per chord name, looking each bar up in `patterns`:
 *   bars('Em C', { Em: 'E2:2 B2:2', C: 'C2:2 G2:2' })  ->  '| E2:2 B2:2 | C2:2 G2:2 |'
 */
export function bars(chords: string, patterns: Record<string, string>): string {
  const out = chords
    .trim()
    .split(/\s+/)
    .map((chord) => {
      const bar = patterns[chord];
      if (bar === undefined) throw new Error(`no pattern for chord "${chord}"`);
      return bar;
    });
  return `| ${out.join(' | ')} |`;
}

/** Applies a rhythm to every chord voicing: rhythm({ C: 'C4+E4+G4' }, (v) => `${v}:2 ${v}:2`). */
export function rhythm(voicings: Record<string, string>, pattern: (voicing: string) => string): Record<string, string> {
  return Object.fromEntries(Object.entries(voicings).map(([chord, v]) => [chord, pattern(v)]));
}
