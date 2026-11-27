import { expect, test } from 'vite-plus/test';
import { POMODORO_SET } from '../src/schedule';

const MINUTE = 60_000;

test('one set is 25 → 5 → 25 → 5 → 25 → 15 minutes', () => {
  expect(POMODORO_SET.map((phase) => phase.durationMs / MINUTE)).toEqual([25, 5, 25, 5, 25, 15]);
});

test('phase types are work → short break → work → short break → work → long break', () => {
  expect(POMODORO_SET.map((phase) => phase.type)).toEqual([
    'work',
    'shortBreak',
    'work',
    'shortBreak',
    'work',
    'longBreak',
  ]);
});

test('each phase has a display label', () => {
  expect(POMODORO_SET.map((phase) => phase.label)).toEqual([
    'Work',
    'Short break',
    'Work',
    'Short break',
    'Work',
    'Long break',
  ]);
});
