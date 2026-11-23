import { readFile } from 'node:fs/promises';
import { beforeAll, expect, test } from 'vitest';
import { POMODORO_SET } from '../src/schedule';
import { createTimer } from '../src/timer';
import { toViewModel, type ViewModel } from '../src/view';

let html = '';
let initial: ViewModel;

beforeAll(async () => {
  html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  initial = toViewModel(createTimer(POMODORO_SET), 0);
});

/** Text content of the element with the given id (assumes no nested elements). */
function textById(id: string): string | undefined {
  return new RegExp(`\\sid="${id}"[^>]*>([^<]*)<`).exec(html)?.[1]?.trim();
}

test('the document language is English', () => {
  expect(html).toMatch(/<html lang="en">/);
});

// The static markup is shown until main.ts renders, so it must match the initial state.
test('the static markup matches the initial render', () => {
  expect(/<title>([^<]*)<\/title>/.exec(html)?.[1]).toBe(initial.documentTitle);
  expect(textById('phase')).toBe(initial.phaseLabel);
  expect(textById('time')).toBe(initial.timeText);
  expect(textById('primary')).toBe(initial.primaryLabel);
});

// The current time depends on when and where the page is opened, so the static markup only
// holds a placeholder of the same width until main.ts renders.
test('the clock starts as a placeholder', () => {
  expect(textById('clock')).toBe('--:--');
});
