import { formatTime } from './format';
import type { PhaseType } from './schedule';
import { currentPhase, getRemainingMs, type Timer, type TimerStatus } from './timer';

const MINUTE = 60_000;

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepViewModel {
  readonly type: PhaseType;
  readonly minutes: number;
  readonly state: StepState;
}

export interface ViewModel {
  readonly timeText: string;
  readonly phaseType: PhaseType | 'finished';
  readonly phaseLabel: string;
  readonly status: TimerStatus;
  readonly primaryLabel: string;
  /** Fraction of the current phase that has elapsed (0 to 1) */
  readonly progress: number;
  readonly documentTitle: string;
  readonly steps: readonly StepViewModel[];
}

export interface Notice {
  readonly title: string;
  readonly body: string;
}

const PRIMARY_LABELS: Readonly<Record<TimerStatus, string>> = {
  idle: 'Start',
  running: 'Pause',
  paused: 'Resume',
  finished: 'Next set',
};

function stepState(timer: Timer, index: number): StepState {
  if (timer.status === 'finished' || index < timer.phaseIndex) return 'done';
  return index === timer.phaseIndex ? 'current' : 'upcoming';
}

/** Returns everything needed to render the screen. */
export function toViewModel(timer: Timer, now: number): ViewModel {
  const isFinished = timer.status === 'finished';
  const phase = currentPhase(timer);
  const remainingMs = isFinished ? 0 : getRemainingMs(timer, now);
  const timeText = formatTime(remainingMs);
  const phaseLabel = isFinished ? 'Set complete!' : phase.label;

  return {
    timeText,
    phaseType: isFinished ? 'finished' : phase.type,
    phaseLabel,
    status: timer.status,
    primaryLabel: PRIMARY_LABELS[timer.status],
    progress: (phase.durationMs - remainingMs) / phase.durationMs,
    documentTitle: `${timeText} ${phaseLabel} | Pomodoro`,
    steps: timer.schedule.map((p, i) => ({
      type: p.type,
      minutes: p.durationMs / MINUTE,
      state: stepState(timer, i),
    })),
  };
}

function bodyFor(timer: Timer): string {
  const phase = currentPhase(timer);
  switch (phase.type) {
    case 'work':
      return 'Break is over. Time to focus.';
    case 'shortBreak':
      return 'Nice work. Take a short break.';
    case 'longBreak': {
      const works = timer.schedule
        .slice(0, timer.phaseIndex)
        .filter((p) => p.type === 'work').length;
      return `${works} ${works === 1 ? 'pomodoro' : 'pomodoros'} done! Take a longer rest.`;
    }
  }
}

/** Notification for an automatic transition caused by time passing, or null if there was none. */
export function transitionMessage(prev: Timer, next: Timer): Notice | null {
  if (prev === next || prev.status !== 'running') return null;

  if (next.status === 'finished') {
    return { title: 'Set complete!', body: 'You finished a full set. Great job!' };
  }
  if (next.status === 'running' && next.phaseIndex !== prev.phaseIndex) {
    const phase = currentPhase(next);
    return {
      title: `${phase.label} (${phase.durationMs / MINUTE} min)`,
      body: bodyFor(next),
    };
  }
  return null;
}
