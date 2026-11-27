/**
 * The chime played when the phase changes, as plain data. src/main.ts plays it with Web Audio.
 *
 * Volume is a percentage of the original chime's loudness: the default (100) sits in the middle
 * of the slider, so it can be turned both up and down from there. 0 is silent.
 */

export const VOLUME = Object.freeze({ min: 0, max: 200, step: 5, default: 100 });

/** Peak gain of each tone at the default volume */
const DEFAULT_PEAK_GAIN = 0.3;

const NOTES: readonly { readonly frequency: number; readonly offset: number }[] = [
  { frequency: 880, offset: 0 },
  { frequency: 660, offset: 0.28 },
  { frequency: 880, offset: 0.56 },
];

export interface Tone {
  readonly frequency: number;
  /** Seconds from the start of the chime */
  readonly offset: number;
  readonly peakGain: number;
}

/** Tones of the chime at the given volume. Empty when it is silent. */
export function chimeTones(volume: number): readonly Tone[] {
  const clamped = Math.min(VOLUME.max, Math.max(VOLUME.min, volume));
  if (clamped === 0) return [];
  const peakGain = (DEFAULT_PEAK_GAIN * clamped) / VOLUME.default;
  return NOTES.map(({ frequency, offset }) => ({ frequency, offset, peakGain }));
}

export function formatVolume(volume: number): string {
  return `${volume}%`;
}
