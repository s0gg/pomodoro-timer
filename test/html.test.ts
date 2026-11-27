import { readFile } from 'node:fs/promises';
import { beforeAll, expect, test } from 'vite-plus/test';
import { POMODORO_SET } from '../src/schedule';
import { formatVolume, VOLUME } from '../src/sound';
import { createTimer, DEFAULT_TIMER_OPTIONS } from '../src/timer';
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

/** Value of an attribute on the element with the given id. */
function attrById(id: string, name: string): string | undefined {
  const tag = new RegExp(`<[^>]*\\sid="${id}"[^>]*>`).exec(html)?.[0] ?? '';
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
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

test('the volume slider covers the range and starts at the default volume', () => {
  expect(attrById('volume', 'type')).toBe('range');
  expect(attrById('volume', 'min')).toBe(String(VOLUME.min));
  expect(attrById('volume', 'max')).toBe(String(VOLUME.max));
  expect(attrById('volume', 'step')).toBe(String(VOLUME.step));
  expect(attrById('volume', 'value')).toBe(String(VOLUME.default));
  expect(textById('volume-value')).toBe(formatVolume(VOLUME.default));
});

test('the volume slider marks the default volume', () => {
  const list = attrById('volume', 'list');
  expect(list).toBeDefined();
  const datalist = new RegExp(`<datalist id="${list}">([\\s\\S]*?)</datalist>`).exec(html)?.[1];
  expect(datalist).toContain(`<option value="${VOLUME.default}">`);
});

test('the next-set checkbox matches the default', () => {
  const tag = /<input[^>]*\sid="auto-next-set"[^>]*>/.exec(html)?.[0];
  expect(tag).toMatch(/\stype="checkbox"/);
  expect(/\schecked[\s/>]/.test(tag ?? '')).toBe(DEFAULT_TIMER_OPTIONS.autoNextSet);
});

// The current time depends on when and where the page is opened, so the static markup only
// holds a placeholder of the same width until main.ts renders.
test('the clock starts as a placeholder', () => {
  expect(textById('clock')).toBe('--:--');
});
