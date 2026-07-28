/**
 * All "today" logic is pinned to Pacific Time (America/Los_Angeles), no matter
 * where the device or server thinks it is. Vercel functions run in UTC, so
 * anything based on `new Date().toISOString()` rolls to "tomorrow" at 4–5pm
 * California time — these helpers are the single source of truth instead.
 */
export const APP_TIMEZONE = "America/Los_Angeles";

// en-CA formats dates as YYYY-MM-DD.
const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date key (YYYY-MM-DD) in Pacific Time. */
export function ptDateKey(date: Date = new Date()): string {
  return dateKeyFormat.format(date);
}

/** Minutes since midnight in Pacific Time. */
export function ptMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Date key shifted by `days` (negative for past). Noon anchor keeps DST from skewing it. */
export function shiftDateKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days from `fromKey` to `toKey` (positive when `toKey` is later). */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T12:00:00`).getTime();
  const to = new Date(`${toKey}T12:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}
