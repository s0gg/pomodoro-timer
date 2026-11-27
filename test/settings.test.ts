import { describe, expect, test } from 'vite-plus/test';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
  SETTINGS_KEY,
  type Settings,
} from '../src/settings';
import { VOLUME } from '../src/sound';
import { DEFAULT_TIMER_OPTIONS } from '../src/timer';

const stored = (value: unknown): Settings => parseSettings(JSON.stringify(value));

test('the defaults are the default volume, sound on, and the timer defaults', () => {
  expect(DEFAULT_SETTINGS).toEqual({
    sound: true,
    volume: VOLUME.default,
    autoNextSet: DEFAULT_TIMER_OPTIONS.autoNextSet,
  });
});

// GitHub Pages serves every project page of an account from the same origin (and localStorage)
test('the storage key is namespaced to this app', () => {
  expect(SETTINGS_KEY).toMatch(/^pomodoro-timer:/);
});

describe('parseSettings', () => {
  test('defaults when nothing is stored yet', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  test('reads back what was saved', () => {
    const settings: Settings = { sound: false, volume: 150, autoNextSet: false };
    expect(parseSettings(serializeSettings(settings))).toEqual(settings);
  });

  test('defaults when the stored value is not valid JSON', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
  });

  test('defaults when the stored value is not an object', () => {
    for (const value of [null, 5, 'text', true, []]) {
      expect(stored(value)).toEqual(DEFAULT_SETTINGS);
    }
  });

  test('uses the default for each setting that is missing', () => {
    expect(stored({ sound: false })).toEqual({ ...DEFAULT_SETTINGS, sound: false });
    expect(stored({ volume: 50 })).toEqual({ ...DEFAULT_SETTINGS, volume: 50 });
  });

  test('uses the default for each setting of the wrong type', () => {
    expect(stored({ sound: 'no', volume: '50', autoNextSet: 0 })).toEqual(DEFAULT_SETTINGS);
  });

  test('ignores settings it does not know', () => {
    expect(stored({ autoNextSet: false, theme: 'dark' })).toEqual({
      ...DEFAULT_SETTINGS,
      autoNextSet: false,
    });
  });

  test('keeps the volume within the slider range and on its steps', () => {
    expect(stored({ volume: VOLUME.max + 100 }).volume).toBe(VOLUME.max);
    expect(stored({ volume: VOLUME.min - 20 }).volume).toBe(VOLUME.min);
    expect(stored({ volume: 37 }).volume).toBe(35);
    expect(stored({ volume: 38 }).volume).toBe(40);
  });
});
