// Thin layer that only wires things up to the DOM. The logic lives in timer.ts / view.ts.
import { POMODORO_SET, type PhaseType } from './schedule';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
  SETTINGS_KEY,
  type Settings,
} from './settings';
import { chimeTones, formatVolume } from './sound';
import {
  createTimer,
  pause,
  reset,
  skip,
  start,
  tick,
  type Timer,
  type TimerOptions,
} from './timer';
import { toViewModel, transitionMessage, type Notice, type StepState } from './view';

function query<T extends Element>(selector: string, type: { new (): T; prototype: T }): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Element not found: ${selector}`);
  return el;
}

const els = {
  clock: query('#clock', HTMLElement),
  phase: query('#phase', HTMLElement),
  time: query('#time', HTMLElement),
  ring: query('#ring-progress', SVGCircleElement),
  steps: query('#steps', HTMLOListElement),
  primary: query('#primary', HTMLButtonElement),
  skip: query('#skip', HTMLButtonElement),
  reset: query('#reset', HTMLButtonElement),
  sound: query('#sound', HTMLInputElement),
  volume: query('#volume', HTMLInputElement),
  volumeValue: query('#volume-value', HTMLOutputElement),
  autoNextSet: query('#auto-next-set', HTMLInputElement),
};

const RING_LENGTH = 2 * Math.PI * els.ring.r.baseVal.value;
els.ring.style.strokeDasharray = String(RING_LENGTH);

const STEP_STATE_TEXT: Readonly<Record<StepState, string>> = {
  done: 'done',
  current: 'in progress',
  upcoming: 'not started',
};
const STEP_TYPE_TEXT: Readonly<Record<PhaseType, string>> = {
  work: 'Work',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

let timer: Timer = createTimer(POMODORO_SET);

// ---- Rendering ----------------------------------------------------------

interface StepElement {
  readonly item: HTMLLIElement;
  readonly fill: HTMLSpanElement;
}

function span(className: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = className;
  return el;
}

function createStepElement(type: PhaseType, minutes: number): StepElement {
  const item = document.createElement('li');
  item.className = 'step';
  item.dataset.type = type;
  item.style.flexGrow = String(minutes);

  const bar = span('step-bar');
  const fill = span('step-fill');
  const label = span('step-label');
  label.textContent = String(minutes);
  bar.append(fill);
  item.append(bar, label);
  return { item, fill };
}

const stepEls = toViewModel(timer, Date.now()).steps.map((step) =>
  createStepElement(step.type, step.minutes),
);
els.steps.append(...stepEls.map((step) => step.item));

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function render(): void {
  const vm = toViewModel(timer, Date.now());

  document.body.dataset.phase = vm.phaseType;
  document.body.dataset.status = vm.status;
  document.title = vm.documentTitle;
  setText(els.clock, vm.clockText);
  setText(els.phase, vm.phaseLabel);
  setText(els.time, vm.timeText);
  setText(els.primary, vm.primaryLabel);
  els.ring.style.strokeDashoffset = String(RING_LENGTH * vm.progress);

  vm.steps.forEach((step, i) => {
    const el = stepEls[i];
    if (!el) return;
    el.item.dataset.state = step.state;
    el.item.setAttribute(
      'aria-label',
      `${STEP_TYPE_TEXT[step.type]}, ${step.minutes} min (${STEP_STATE_TEXT[step.state]})`,
    );
    const fill = step.state === 'done' ? 1 : step.state === 'current' ? vm.progress : 0;
    el.fill.style.width = `${fill * 100}%`;
  });
}

// ---- Notifications and sound --------------------------------------------

let audioCtx: AudioContext | null = null;

// Autoplay policy: create the AudioContext while handling a user gesture
function prepareAudio(): void {
  if (!('AudioContext' in window)) return;
  audioCtx ??= new AudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => undefined);
  }
}

function chime(): void {
  const ctx = audioCtx;
  if (!ctx || !els.sound.checked) return;
  const t0 = ctx.currentTime;
  for (const tone of chimeTones(els.volume.valueAsNumber)) {
    const at = t0 + tone.offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(tone.peakGain, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.26);
  }
}

function renderVolume(): void {
  els.volume.disabled = !els.sound.checked;
  setText(els.volumeValue, formatVolume(els.volume.valueAsNumber));
}

function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => undefined);
  }
}

function notify({ title, body }: Notice): void {
  chime();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // oxlint-disable-next-line eslint/no-new -- constructing it shows the notification
      new Notification(title, { body, tag: 'pomodoro' });
    } catch {
      // new Notification is not supported in some environments (e.g. Android Chrome)
    }
  }
}

// ---- Settings -----------------------------------------------------------

// localStorage can throw (e.g. when storage is disabled); then settings just are not remembered
function loadSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(): void {
  const settings: Settings = {
    sound: els.sound.checked,
    volume: els.volume.valueAsNumber,
    autoNextSet: els.autoNextSet.checked,
  };
  try {
    localStorage.setItem(SETTINGS_KEY, serializeSettings(settings));
  } catch {
    // Not remembered, but the setting still applies until the page is closed
  }
}

function applySettings(settings: Settings): void {
  els.sound.checked = settings.sound;
  els.volume.valueAsNumber = settings.volume;
  els.autoNextSet.checked = settings.autoNextSet;
}

// ---- State updates ------------------------------------------------------

type Action = (timer: Timer, now: number) => Timer;

const timerOptions = (): TimerOptions => ({ autoNextSet: els.autoNextSet.checked });

function advance(): void {
  const next = tick(timer, Date.now(), timerOptions());
  const message = transitionMessage(timer, next);
  timer = next;
  if (message) notify(message);
}

function update(action?: Action): void {
  advance();
  if (action) timer = action(timer, Date.now());
  render();
}

function togglePrimary(): void {
  prepareAudio();
  requestNotificationPermission();
  update((t, now) => (t.status === 'running' ? pause(t, now) : start(t, now)));
}

els.primary.addEventListener('click', togglePrimary);
els.skip.addEventListener('click', () => update((t, now) => skip(t, now, timerOptions())));
els.reset.addEventListener('click', () => update(reset));

for (const input of [els.sound, els.volume, els.autoNextSet]) {
  input.addEventListener('change', saveSettings);
}

els.sound.addEventListener('change', renderVolume);
els.volume.addEventListener('input', renderVolume);
// Play the chime at the new volume once the slider is released, so you can hear how loud it is
els.volume.addEventListener('change', () => {
  prepareAudio();
  chime();
});

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return;
  if (event.target instanceof Element && event.target.closest('button, input, textarea, select')) {
    return;
  }
  event.preventDefault();
  togglePrimary();
});

document.addEventListener('visibilitychange', () => update());
applySettings(loadSettings());
setInterval(() => update(), 250);
render();
renderVolume();
