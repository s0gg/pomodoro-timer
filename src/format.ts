const pad = (n: number): string => String(n).padStart(2, '0');

/** Formats the remaining time (ms) as "MM:SS", rounding partial seconds up. */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Formats an epoch time (ms) as the local time of day in 24-hour "HH:MM", dropping seconds. */
export function formatClock(epochMs: number): string {
  const date = new Date(epochMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
