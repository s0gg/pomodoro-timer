/**
 * The user's settings and how they are stored. src/main.ts reads and writes them with localStorage;
 * this module only turns them into a string and back.
 */
import { VOLUME } from './sound';
import { DEFAULT_TIMER_OPTIONS } from './timer';

export interface Settings {
  /** Play a sound when the phase changes */
  readonly sound: boolean;
  /** Chime volume, in percent of the default */
  readonly volume: number;
  /** Start the next set automatically when a set ends */
  readonly autoNextSet: boolean;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  sound: true,
  volume: VOLUME.default,
  autoNextSet: DEFAULT_TIMER_OPTIONS.autoNextSet,
});

/** GitHub Pages serves every project page of an account from one origin, so it is namespaced. */
export const SETTINGS_KEY = 'pomodoro-timer:settings';

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings);
}

/** Keeps the volume within the slider range and on its steps, as the slider itself would. */
function toVolume(value: number): number {
  const clamped = Math.min(VOLUME.max, Math.max(VOLUME.min, value));
  return Math.round(clamped / VOLUME.step) * VOLUME.step;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Reads stored settings. Anything missing, of the wrong type, or unreadable falls back to the
 * default, one setting at a time, so a stored value from an older or newer version still loads.
 */
export function parseSettings(raw: string | null): Settings {
  const stored = raw === null ? undefined : parseJson(raw);
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return DEFAULT_SETTINGS;
  }
  return {
    sound:
      'sound' in stored && typeof stored.sound === 'boolean'
        ? stored.sound
        : DEFAULT_SETTINGS.sound,
    volume:
      'volume' in stored && typeof stored.volume === 'number'
        ? toVolume(stored.volume)
        : DEFAULT_SETTINGS.volume,
    autoNextSet:
      'autoNextSet' in stored && typeof stored.autoNextSet === 'boolean'
        ? stored.autoNextSet
        : DEFAULT_SETTINGS.autoNextSet,
  };
}
