/**
 * State transitions of the Pomodoro timer (pure functions, immutable).
 *
 * While running, the timer holds the scheduled end time `endsAt` and derives the remaining
 * time from `now` on every call, so it stays accurate even when a background tab throttles ticks.
 */
import type { Phase, Schedule } from './schedule';

export type StoppedStatus = 'idle' | 'paused' | 'finished';
export type TimerStatus = StoppedStatus | 'running';

interface TimerBase {
  readonly schedule: Schedule;
  readonly phaseIndex: number;
}

/** Running: holds the scheduled end time */
export interface RunningTimer extends TimerBase {
  readonly status: 'running';
  readonly endsAt: number;
}

/** Stopped: holds the remaining time */
export interface StoppedTimer extends TimerBase {
  readonly status: StoppedStatus;
  readonly remainingMs: number;
}

export type Timer = RunningTimer | StoppedTimer;

function phaseAt(schedule: Schedule, index: number): Phase {
  const phase = schedule[index];
  if (phase === undefined) throw new RangeError(`phase index out of range: ${index}`);
  return phase;
}

function stopped(
  schedule: Schedule,
  phaseIndex: number,
  status: StoppedStatus,
  remainingMs: number,
): StoppedTimer {
  return Object.freeze({ schedule, phaseIndex, status, remainingMs });
}

function running(schedule: Schedule, phaseIndex: number, endsAt: number): RunningTimer {
  return Object.freeze({ schedule, phaseIndex, status: 'running', endsAt });
}

/** Stopped at the start of a phase (remaining time = phase duration) */
function atPhase(schedule: Schedule, phaseIndex: number, status: StoppedStatus): StoppedTimer {
  return stopped(schedule, phaseIndex, status, phaseAt(schedule, phaseIndex).durationMs);
}

export function createTimer(schedule: Schedule): Timer {
  if (schedule.length === 0) {
    throw new Error('schedule must contain at least one phase');
  }
  return atPhase(schedule, 0, 'idle');
}

export function currentPhase(timer: Timer): Phase {
  return phaseAt(timer.schedule, timer.phaseIndex);
}

export function getRemainingMs(timer: Timer, now: number): number {
  return timer.status === 'running' ? Math.max(0, timer.endsAt - now) : timer.remainingMs;
}

export function start(timer: Timer, now: number): Timer {
  if (timer.status === 'running') return timer;
  return running(timer.schedule, timer.phaseIndex, now + timer.remainingMs);
}

export function pause(timer: Timer, now: number): Timer {
  if (timer.status !== 'running') return timer;
  return stopped(timer.schedule, timer.phaseIndex, 'paused', getRemainingMs(timer, now));
}

export function reset(timer: Timer): Timer {
  return atPhase(timer.schedule, 0, 'idle');
}

export function skip(timer: Timer, now: number): Timer {
  const next = timer.phaseIndex + 1;
  if (next >= timer.schedule.length) return atPhase(timer.schedule, 0, 'finished');
  const skipped = atPhase(timer.schedule, next, 'idle');
  return timer.status === 'running' ? start(skipped, now) : skipped;
}

/** Advances past every phase whose time is up. Returns the same object if nothing changed. */
export function tick(timer: Timer, now: number): Timer {
  if (timer.status !== 'running' || now < timer.endsAt) return timer;

  const { schedule } = timer;
  let { phaseIndex, endsAt } = timer;
  while (now >= endsAt) {
    phaseIndex += 1;
    if (phaseIndex >= schedule.length) return atPhase(schedule, 0, 'finished');
    endsAt += phaseAt(schedule, phaseIndex).durationMs;
  }
  return running(schedule, phaseIndex, endsAt);
}
