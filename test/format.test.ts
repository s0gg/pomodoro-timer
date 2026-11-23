import { expect, test } from 'vitest';
import { formatClock, formatTime } from '../src/format';

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

// Local times are built with the Date constructor so the tests pass in any time zone.
const at = (hours: number, minutes: number, seconds = 0): number =>
  new Date(2026, 10, 23, hours, minutes, seconds).getTime();

test('formats the local time of day as 24-hour HH:MM', () => {
  expect(formatClock(at(9, 5))).toBe('09:05');
  expect(formatClock(at(0, 0))).toBe('00:00');
  expect(formatClock(at(23, 59))).toBe('23:59');
});

test('drops seconds instead of rounding (the clock only turns over at the minute)', () => {
  expect(formatClock(at(10, 29, 59))).toBe('10:29');
});
