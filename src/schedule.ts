const MINUTE = 60_000;

export type PhaseType = 'work' | 'shortBreak' | 'longBreak';

export interface Phase {
  readonly type: PhaseType;
  readonly label: string;
  readonly durationMs: number;
}

export type Schedule = readonly Phase[];

const LABELS: Readonly<Record<PhaseType, string>> = {
  work: 'Work',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

const phase = (type: PhaseType, minutes: number): Phase =>
  Object.freeze({
    type,
    label: LABELS[type],
    durationMs: minutes * MINUTE,
  });

/** One set: 25 → 5 → 25 → 5 → 25 → 15 minutes */
export const POMODORO_SET: Schedule = Object.freeze([
  phase('work', 25),
  phase('shortBreak', 5),
  phase('work', 25),
  phase('shortBreak', 5),
  phase('work', 25),
  phase('longBreak', 15),
]);
