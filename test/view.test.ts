import { describe, expect, test } from 'vitest';
import { POMODORO_SET, type Schedule } from '../src/schedule';
import { createTimer, pause, skip, start, tick, type Timer } from '../src/timer';
import { toViewModel, transitionMessage } from '../src/view';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

const idle = (): Timer => createTimer(POMODORO_SET);
const running = (): Timer => start(idle(), T0);
const finished = (): Timer => tick(running(), T0 + 100 * MIN);

describe('toViewModel', () => {
  test('idle: 25:00 / Work / Start / no progress', () => {
    const vm = toViewModel(idle(), T0);
    expect(vm.timeText).toBe('25:00');
    expect(vm.phaseType).toBe('work');
    expect(vm.phaseLabel).toBe('Work');
    expect(vm.primaryLabel).toBe('Start');
    expect(vm.progress).toBe(0);
  });

  test('running: remaining time and progress, button says Pause', () => {
    const vm = toViewModel(running(), T0 + 5 * MIN);
    expect(vm.timeText).toBe('20:00');
    expect(vm.primaryLabel).toBe('Pause');
    expect(vm.progress).toBe(0.2);
  });

  test('paused: button says Resume', () => {
    const vm = toViewModel(pause(running(), T0 + MIN), T0 + 2 * MIN);
    expect(vm.timeText).toBe('24:00');
    expect(vm.primaryLabel).toBe('Resume');
  });

  test('phase type and label change during a break', () => {
    const vm = toViewModel(skip(idle(), T0), T0);
    expect(vm.phaseType).toBe('shortBreak');
    expect(vm.phaseLabel).toBe('Short break');
    expect(vm.timeText).toBe('05:00');
  });

  test('finished: 00:00 / Set complete! / Next set / full progress', () => {
    const vm = toViewModel(finished(), T0 + 100 * MIN);
    expect(vm.phaseType).toBe('finished');
    expect(vm.phaseLabel).toBe('Set complete!');
    expect(vm.timeText).toBe('00:00');
    expect(vm.primaryLabel).toBe('Next set');
    expect(vm.progress).toBe(1);
  });

  test('clock shows the current local time regardless of the timer state', () => {
    const now = new Date(2026, 10, 23, 10, 32, 45).getTime();
    expect(toViewModel(idle(), now).clockText).toBe('10:32');
    expect(toViewModel(running(), now).clockText).toBe('10:32');
  });

  test('tab title shows the remaining time and phase', () => {
    expect(toViewModel(running(), T0 + 5 * MIN).documentTitle).toBe('20:00 Work | Pomodoro');
  });

  test('steps distinguish done, current and upcoming', () => {
    const timer = tick(running(), T0 + 30 * MIN); // start of the 3rd phase (work)
    expect(toViewModel(timer, T0 + 30 * MIN).steps).toEqual([
      { type: 'work', minutes: 25, state: 'done' },
      { type: 'shortBreak', minutes: 5, state: 'done' },
      { type: 'work', minutes: 25, state: 'current' },
      { type: 'shortBreak', minutes: 5, state: 'upcoming' },
      { type: 'work', minutes: 25, state: 'upcoming' },
      { type: 'longBreak', minutes: 15, state: 'upcoming' },
    ]);
  });

  test('all steps are done once the set is finished', () => {
    const states = toViewModel(finished(), T0).steps.map((s) => s.state);
    expect(states).toEqual(Array.from({ length: 6 }, () => 'done'));
  });
});

describe('transitionMessage', () => {
  test('null when nothing changed', () => {
    const timer = running();
    expect(transitionMessage(timer, timer)).toBeNull();
  });

  test('work → short break', () => {
    const prev = running();
    const next = tick(prev, T0 + 25 * MIN);
    expect(transitionMessage(prev, next)).toEqual({
      title: 'Short break (5 min)',
      body: 'Nice work. Take a short break.',
    });
  });

  test('break → work', () => {
    const prev = tick(running(), T0 + 25 * MIN);
    const next = tick(prev, T0 + 30 * MIN);
    expect(transitionMessage(prev, next)).toEqual({
      title: 'Work (25 min)',
      body: 'Break is over. Time to focus.',
    });
  });

  test('work → long break', () => {
    const prev = tick(running(), T0 + 60 * MIN);
    const next = tick(prev, T0 + 85 * MIN);
    expect(transitionMessage(prev, next)).toEqual({
      title: 'Long break (15 min)',
      body: '3 pomodoros done! Take a longer rest.',
    });
  });

  test('uses the singular when only one pomodoro precedes the long break', () => {
    const schedule: Schedule = [
      { type: 'work', label: 'Work', durationMs: 25 * MIN },
      { type: 'longBreak', label: 'Long break', durationMs: 15 * MIN },
    ];
    const prev = start(createTimer(schedule), T0);
    const next = tick(prev, T0 + 25 * MIN);
    expect(transitionMessage(prev, next)?.body).toBe('1 pomodoro done! Take a longer rest.');
  });

  test('long break → set complete', () => {
    const prev = tick(running(), T0 + 85 * MIN);
    const next = tick(prev, T0 + 100 * MIN);
    expect(transitionMessage(prev, next)).toEqual({
      title: 'Set complete!',
      body: 'You finished a full set. Great job!',
    });
  });

  test('no notification for manual actions such as pause', () => {
    const prev = running();
    expect(transitionMessage(prev, pause(prev, T0 + MIN))).toBeNull();
  });
});
