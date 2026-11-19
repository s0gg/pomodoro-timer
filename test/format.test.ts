import { expect, test } from 'vitest';
import { formatTime } from '../src/format';

test('formats milliseconds as MM:SS', () => {
  expect(formatTime(25 * 60_000)).toBe('25:00');
  expect(formatTime(5 * 60_000 + 3_000)).toBe('05:03');
  expect(formatTime(9_000)).toBe('00:09');
});

test('rounds partial seconds up (25:00 right after starting, 00:00 only at the end)', () => {
  expect(formatTime(25 * 60_000 - 1)).toBe('25:00');
  expect(formatTime(1)).toBe('00:01');
  expect(formatTime(0)).toBe('00:00');
});

test('treats negative values as 00:00', () => {
  expect(formatTime(-5_000)).toBe('00:00');
});
