import { describe, expect, test } from 'vite-plus/test';
import { chimeTones, formatVolume, VOLUME } from '../src/sound';

const peaks = (volume: number): number[] => chimeTones(volume).map((tone) => tone.peakGain);

describe('VOLUME', () => {
  test('the default sits in the middle of the range, so it can go both up and down', () => {
    expect(VOLUME.min).toBe(0);
    expect(VOLUME.default).toBe((VOLUME.min + VOLUME.max) / 2);
  });
});

describe('chimeTones', () => {
  test('the default volume plays the original chime: 880 → 660 → 880 Hz at peak gain 0.3', () => {
    expect(chimeTones(VOLUME.default)).toEqual([
      { frequency: 880, offset: 0, peakGain: 0.3 },
      { frequency: 660, offset: 0.28, peakGain: 0.3 },
      { frequency: 880, offset: 0.56, peakGain: 0.3 },
    ]);
  });

  test('louder than the default', () => {
    for (const gain of peaks(VOLUME.max)) expect(gain).toBeCloseTo(0.6);
  });

  test('quieter than the default', () => {
    for (const gain of peaks(VOLUME.default / 2)) expect(gain).toBeCloseTo(0.15);
  });

  test('the minimum is silent: no tones at all', () => {
    expect(chimeTones(VOLUME.min)).toEqual([]);
  });

  test('clamps volumes outside the range', () => {
    expect(chimeTones(VOLUME.max + 50)).toEqual(chimeTones(VOLUME.max));
    expect(chimeTones(-10)).toEqual([]);
  });
});

test('formats the volume as a percentage of the default', () => {
  expect(formatVolume(VOLUME.default)).toBe('100%');
  expect(formatVolume(VOLUME.max)).toBe('200%');
  expect(formatVolume(0)).toBe('0%');
});
