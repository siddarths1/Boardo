import { localDate, localDayRange } from "./planner";
export type TimedSession = { startedAt: Date | string; endedAt: Date | string | null; limitAt?: Date | string | null };
const millis = (value: Date | string) => new Date(value).getTime();
export function focusEnd(session: TimedSession, now = new Date()) {
  // A recorded stop is authoritative, including legacy entries.
  return session.endedAt ? millis(session.endedAt) : Math.min(now.getTime(), session.limitAt ? millis(session.limitAt) : millis(session.startedAt) + 180 * 60000);
}
export function dayBounds(date: string, timezone: string) {
  let anchor = new Date(date + "T12:00:00Z");
  const actual = localDate(anchor, timezone);
  if (actual !== date) anchor = new Date(anchor.getTime() + (actual > date ? -1 : 1) * 86400000);
  return localDayRange(anchor, timezone);
}
export function shiftDate(date: string, days: number) {
  return new Date(Date.parse(date + "T12:00:00Z") + days * 86400000).toISOString().slice(0, 10);
}
export function earliestDate(today: string) {
  const d = new Date(today + "T12:00:00Z"); const month = d.getUTCMonth();
  d.setUTCFullYear(d.getUTCFullYear() - 3);
  if (d.getUTCMonth() !== month) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
export type MetricDay = { date: string; focusSeconds: number; availableMinutes: number | null; bufferMinutes: number; capacityMinutes: number | null; unusedMinutes: number | null; overtimeMinutes: number; completions: number; sessions: number };
export function allocateSession(session: TimedSession, days: { date: string; start: number; end: number }[], now = new Date()) {
  const start = millis(session.startedAt), end = focusEnd(session, now);
  return days.map(day => ({ date: day.date, seconds: Math.max(0, Math.min(end, day.end) - Math.max(start, day.start)) / 1000 })).filter(d => d.seconds > 0);
}
export function capacityMetrics(focusSeconds: number, availableMinutes: number | null, bufferPercent = 0) {
  const bufferMinutes = availableMinutes === null ? 0 : availableMinutes * bufferPercent / 100;
  const capacityMinutes = availableMinutes === null ? null : availableMinutes - bufferMinutes;
  return { bufferMinutes, capacityMinutes, unusedMinutes: capacityMinutes === null ? null : Math.max(0, capacityMinutes - focusSeconds / 60), overtimeMinutes: capacityMinutes === null ? 0 : Math.max(0, focusSeconds / 60 - capacityMinutes) };
}
