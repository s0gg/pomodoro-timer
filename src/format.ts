const pad = (n: number): string => String(n).padStart(2, '0');

/** Formats the remaining time (ms) as "MM:SS", rounding partial seconds up. */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}
