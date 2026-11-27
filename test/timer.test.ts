import { describe, expect, test } from 'vite-plus/test';
import { POMODORO_SET } from '../src/schedule';
import {
  createTimer,
  currentPhase,
  DEFAULT_TIMER_OPTIONS,
  getRemainingMs,
  pause,
  reset,
  skip,
  start,
  tick,
  type Timer,
} from '../src/timer';

const SEC = 1_000;
const MIN = 60_000;
const T0 = 1_700_000_000_000;

const startedTimer = (): Timer => start(createTimer(POMODORO_SET), T0);
const STOP_AFTER_SET = { autoNextSet: false };

describe('createTimer', () => {
  test('starts idle in the first work phase', () => {
    const timer = createTimer(POMODORO_SET);
    expect(timer.status).toBe('idle');
    expect(timer.phaseIndex).toBe(0);
    expect(currentPhase(timer).type).toBe('work');
    expect(getRemainingMs(timer, T0)).toBe(25 * MIN);
  });

  test('throws on an empty schedule', () => {
    expect(() => createTimer([])).toThrow('schedule must contain at least one phase');
  });

  // A set with no length would make the next set start over and over without time passing
  test('throws on a phase without a positive duration', () => {
    expect(() => createTimer([{ type: 'work', label: 'Work', durationMs: 0 }])).toThrow(
      'every phase must last longer than 0 ms',
    );
  });
});

describe('start / pause', () => {
  test('remaining time decreases as time passes after starting', () => {
    const timer = startedTimer();
    expect(timer.status).toBe('running');
    expect(getRemainingMs(timer, T0 + 10 * SEC)).toBe(25 * MIN - 10 * SEC);
  });

  test('pausing freezes the remaining time', () => {
    const paused = pause(startedTimer(), T0 + 10 * SEC);
    expect(paused.status).toBe('paused');
    expect(getRemainingMs(paused, T0 + 10 * MIN)).toBe(25 * MIN - 10 * SEC);
  });

  test('resuming continues from where it was paused', () => {
    const paused = pause(startedTimer(), T0 + 10 * SEC);
    const resumed = start(paused, T0 + 5 * MIN);
    expect(resumed.status).toBe('running');
    expect(getRemainingMs(resumed, T0 + 5 * MIN + 20 * SEC)).toBe(25 * MIN - 30 * SEC);
  });

  test('start while running changes nothing', () => {
    const timer = startedTimer();
    expect(start(timer, T0 + 5 * SEC)).toBe(timer);
  });

  test('pause while stopped changes nothing', () => {
    const timer = createTimer(POMODORO_SET);
    expect(pause(timer, T0)).toBe(timer);
  });

  test('remaining time never goes negative', () => {
    expect(getRemainingMs(startedTimer(), T0 + 30 * MIN)).toBe(0);
  });
});

describe('tick', () => {
  test('nothing changes before time is up', () => {
    const timer = startedTimer();
    expect(tick(timer, T0 + 25 * MIN - 1)).toBe(timer);
  });

  test('moves to a short break automatically when work ends', () => {
    const next = tick(startedTimer(), T0 + 25 * MIN);
    expect(next.status).toBe('running');
    expect(next.phaseIndex).toBe(1);
    expect(currentPhase(next).type).toBe('shortBreak');
    expect(getRemainingMs(next, T0 + 25 * MIN)).toBe(5 * MIN);
  });

  test('a late tick still times the next phase from the scheduled end (no drift)', () => {
    const next = tick(startedTimer(), T0 + 25 * MIN + 3 * SEC);
    expect(next.phaseIndex).toBe(1);
    expect(getRemainingMs(next, T0 + 25 * MIN + 3 * SEC)).toBe(5 * MIN - 3 * SEC);
  });

  test('advances through every elapsed phase even after a long gap between ticks', () => {
    // 25 + 5 + 25 = 55 min elapsed → 1 min into the 4th phase (short break)
    const next = tick(startedTimer(), T0 + 56 * MIN);
    expect(next.phaseIndex).toBe(3);
    expect(getRemainingMs(next, T0 + 56 * MIN)).toBe(4 * MIN);
  });

  test('goes through 25 → 5 → 25 → 5 → 25 → 15 in order', () => {
    let timer = startedTimer();
    let now = T0;
    const visited = [currentPhase(timer).durationMs / MIN];
    for (let i = 0; i < 5; i++) {
      now += currentPhase(timer).durationMs;
      timer = tick(timer, now);
      visited.push(currentPhase(timer).durationMs / MIN);
    }
    expect(visited).toEqual([25, 5, 25, 5, 25, 15]);
  });

  test('does not advance while paused, however much time passes', () => {
    const paused = pause(startedTimer(), T0 + SEC);
    expect(tick(paused, T0 + 60 * MIN)).toBe(paused);
  });
});

describe('tick at the end of a set', () => {
  test('starting the next set automatically is the default', () => {
    expect(DEFAULT_TIMER_OPTIONS.autoNextSet).toBe(true);
  });

  test('by default, the next set starts right after the long break', () => {
    const next = tick(startedTimer(), T0 + 100 * MIN);
    expect(next.status).toBe('running');
    expect(next.phaseIndex).toBe(0);
    expect(getRemainingMs(next, T0 + 100 * MIN)).toBe(25 * MIN);
  });

  test('the next set is timed from the scheduled end of the previous one (no drift)', () => {
    // One set is 100 min: 110 min in is 10 min into the next set's first work phase
    const next = tick(startedTimer(), T0 + 110 * MIN);
    expect(next.phaseIndex).toBe(0);
    expect(getRemainingMs(next, T0 + 110 * MIN)).toBe(15 * MIN);
  });

  test('keeps going through as many sets as have passed', () => {
    // 2 sets (200 min) + 25 + 5 + 2 min → 2 min into the 3rd phase of the 3rd set
    const next = tick(startedTimer(), T0 + 232 * MIN);
    expect(next.status).toBe('running');
    expect(next.phaseIndex).toBe(2);
    expect(getRemainingMs(next, T0 + 232 * MIN)).toBe(23 * MIN);
  });

  test('when turned off, stops with the set finished, back at the first work phase', () => {
    const done = tick(startedTimer(), T0 + 100 * MIN, STOP_AFTER_SET);
    expect(done.status).toBe('finished');
    expect(done.phaseIndex).toBe(0);
    expect(getRemainingMs(done, T0 + 200 * MIN)).toBe(25 * MIN);
  });

  test('starting after the set is finished begins a new set', () => {
    const done = tick(startedTimer(), T0 + 100 * MIN, STOP_AFTER_SET);
    const again = start(done, T0 + 101 * MIN);
    expect(again.status).toBe('running');
    expect(again.phaseIndex).toBe(0);
    expect(getRemainingMs(again, T0 + 101 * MIN)).toBe(25 * MIN);
  });
});

describe('skip', () => {
  test('skipping while running starts the next phase now', () => {
    const skipped = skip(startedTimer(), T0 + 3 * MIN);
    expect(skipped.status).toBe('running');
    expect(skipped.phaseIndex).toBe(1);
    expect(getRemainingMs(skipped, T0 + 3 * MIN)).toBe(5 * MIN);
  });

  test('skipping while stopped waits at the start of the next phase', () => {
    const paused = pause(startedTimer(), T0 + 3 * MIN);
    const skipped = skip(paused, T0 + 4 * MIN);
    expect(skipped.status).toBe('idle');
    expect(skipped.phaseIndex).toBe(1);
    expect(getRemainingMs(skipped, T0 + 10 * MIN)).toBe(5 * MIN);
  });

  test('skipping the last phase while stopped finishes the set', () => {
    let timer = createTimer(POMODORO_SET);
    for (let i = 0; i < 5; i++) timer = skip(timer, T0);
    expect(currentPhase(timer).type).toBe('longBreak');
    const done = skip(timer, T0);
    expect(done.status).toBe('finished');
    expect(done.phaseIndex).toBe(0);
  });

  test('skipping the long break while running starts the next set now (the set ended)', () => {
    const longBreak = tick(startedTimer(), T0 + 85 * MIN);
    expect(currentPhase(longBreak).type).toBe('longBreak');
    const next = skip(longBreak, T0 + 90 * MIN);
    expect(next.status).toBe('running');
    expect(next.phaseIndex).toBe(0);
    expect(getRemainingMs(next, T0 + 90 * MIN)).toBe(25 * MIN);
  });

  test('when turned off, skipping the long break while running finishes the set', () => {
    const longBreak = tick(startedTimer(), T0 + 85 * MIN);
    const done = skip(longBreak, T0 + 90 * MIN, STOP_AFTER_SET);
    expect(done.status).toBe('finished');
    expect(done.phaseIndex).toBe(0);
  });
});

describe('reset', () => {
  test('returns to idle at the first work phase from any state', () => {
    const progressed = tick(startedTimer(), T0 + 40 * MIN);
    const fresh = reset(progressed);
    expect(fresh.status).toBe('idle');
    expect(fresh.phaseIndex).toBe(0);
    expect(getRemainingMs(fresh, T0 + 50 * MIN)).toBe(25 * MIN);
  });
});
