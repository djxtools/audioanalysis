export interface KeyInfo {
  name: string;
  alt: string;
  scale: string;
  roman: string[];
  chords: string[];
}

export const keys: KeyInfo[] = [
  { name: "C Major", alt: "8B • 1d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["C", "G", "Am", "F"] },
  { name: "G Major", alt: "9B • 2d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["G", "D", "Em", "C"] },
  { name: "D Major", alt: "10B • 3d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["D", "A", "Bm", "G"] },
  { name: "A Major", alt: "11B • 4d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["A", "E", "F#m", "D"] },
  { name: "E Major", alt: "12B • 5d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["E", "B", "C#m", "A"] },
  { name: "B Major", alt: "1B • 6d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["B", "F#", "G#m", "E"] },
  { name: "F# Major", alt: "2B • 7d", scale: "Ionian", roman: ["I", "V", "vi", "IV"], chords: ["F#", "C#", "D#m", "B"] },
  { name: "A Minor", alt: "8A • 1m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["Am", "F", "C", "G"] },
  { name: "E Minor", alt: "9A • 2m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["Em", "C", "G", "D"] },
  { name: "B Minor", alt: "10A • 3m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["Bm", "G", "D", "A"] },
  { name: "F# Minor", alt: "11A • 4m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["F#m", "D", "A", "E"] },
  { name: "C# Minor", alt: "12A • 5m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["C#m", "A", "E", "B"] },
  { name: "G# Minor", alt: "1A • 6m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["G#m", "E", "B", "F#"] },
  { name: "D# Minor", alt: "2A • 7m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["D#m", "B", "F#", "C#"] },
  { name: "Eb Minor", alt: "2A • 7m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["Ebm", "Cb", "Gb", "Db"] },
  { name: "Bb Minor", alt: "3A • 8m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["Bbm", "Gb", "Db", "Ab"] },
  { name: "F Minor", alt: "4A • 9m", scale: "Natural minor", roman: ["i", "VI", "III", "VII"], chords: ["Fm", "Db", "Ab", "Eb"] },
];

export const noteToMidi: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

export function parseChord(ch: string): number[] {
  const m = ch.match(/^([A-G][b#]?)(m?)/);
  if (!m) return [60, 64, 67];
  const root = noteToMidi[m[1]];
  const minor = m[2] === 'm';
  const third = minor ? 3 : 4;
  return [60 + root, 60 + root + third, 60 + root + 7];
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function isBlackKey(n: number): boolean {
  return [1, 3, 6, 8, 10].includes(n % 12);
}
