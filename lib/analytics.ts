import { User } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./http";
import { localDate } from "./planner";
import { allocateSession, capacityMetrics, dayBounds, earliestDate, focusEnd, MetricDay, shiftDate } from "./time-metrics";

export async function reviewAnalytics(user: User, start: string, end: string) {
  const now = new Date(), today = localDate(now, user.timezone), earliest = earliestDate(today);
  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
  if (!valid(start) || !valid(end) || start > end || start < earliest || end > today) throw new HttpError(400, "Choose dates within the last three years, ending no later than today.");
  const bounds = [];
  for (let date = start; date <= end; date = shiftDate(date, 1)) bounds.push({ date, ...dayBounds(date, user.timezone) });
  const from = new Date(bounds[0].start), until = new Date(bounds[bounds.length - 1].end);
  const [sessions, intents, events, first] = await Promise.all([
    prisma.focusSession.findMany({ where: { userId: user.id, startedAt: { lt: until }, OR: [{ endedAt: { gt: from } }, { endedAt: null }] }, orderBy: { startedAt: "desc" } }),
    prisma.dailyIntent.findMany({ where: { userId: user.id, date: { gte: start, lte: end } } }),
    prisma.activityEvent.findMany({ where: { userId: user.id, createdAt: { gte: from, lt: until } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.focusSession.findFirst({ where: { userId: user.id }, orderBy: { startedAt: "asc" }, select: { startedAt: true } }),
  ]);
  const days: MetricDay[] = bounds.map(b => { const intent = intents.find(i => i.date === b.date && i.capacityConfirmed); return { date: b.date, focusSeconds: 0, availableMinutes: intent?.availableMinutes ?? null, ...capacityMetrics(0, intent?.availableMinutes ?? null, intent?.bufferPercent), completions: 0, sessions: 0 }; });
  const dayMap = new Map(days.map(d => [d.date, d]));
  type Group = { id: string; name: string; seconds: number; sessions: number };
  const projects = new Map<string, Group>(), goals = new Map<string, Group>();
  function add(map: Map<string, Group>, id: string | null, name: string, seconds: number) {
    const key = id || "unassigned", group = map.get(key) || { id: key, name, seconds: 0, sessions: 0 };
    group.seconds += seconds; group.sessions++; map.set(key, group);
  }
  const visibleSessions = [];
  for (const session of sessions) {
    const slices = allocateSession(session, bounds, now), seconds = slices.reduce((n,s) => n+s.seconds,0);
    if (seconds <= 0) continue;
    for (const slice of slices) { const day = dayMap.get(slice.date)!; day.focusSeconds += slice.seconds; day.sessions++; }
    add(projects, session.projectId, session.projectName || "Unknown project", seconds);
    add(goals, session.goalId, session.goalTitle || "No goal linked", seconds);
    visibleSessions.push({ ...session, effectiveEnd: new Date(focusEnd(session, now)).toISOString(), seconds, running: !session.endedAt && focusEnd(session, now) > now.getTime() - 1, capped: !session.endedAt && focusEnd(session, now) < now.getTime() });
  }
  const completed = new Set<string>(), perDay = new Set<string>();
  for (const event of events.filter(e => e.action === "done")) {
    const date = localDate(event.createdAt, user.timezone), id = event.taskId || event.id;
    completed.add(id);
    if (!perDay.has(date + id)) { perDay.add(date + id); const d=dayMap.get(date); if(d) d.completions++; }
  }
  for (const day of days) Object.assign(day, capacityMetrics(day.focusSeconds, day.availableMinutes, intents.find(i => i.date === day.date)?.bufferPercent));
  const totalSeconds = days.reduce((n,d)=>n+d.focusSeconds,0);
  const plannedDays = days.filter(d=>d.availableMinutes !== null);
  const plannedCapacity = plannedDays.reduce((n,d)=>n+d.capacityMinutes!,0);
  const plannedFocus = plannedDays.reduce((n,d)=>n+d.focusSeconds,0);
  return { start, end, today, earliest, timezone: user.timezone, generatedAt: now.toISOString(), firstTrackedDate: first ? localDate(first.startedAt,user.timezone) : null,
    days, projects: [...projects.values()].sort((a,b)=>b.seconds-a.seconds), goals: [...goals.values()].sort((a,b)=>b.seconds-a.seconds),
    totals: { focusSeconds: totalSeconds, completedTasks: completed.size, sessionCount: visibleSessions.length, activeDays: days.filter(d=>d.focusSeconds>0).length,
      plannedDays: plannedDays.length, missingPlanDays: days.length-plannedDays.length, capacityMinutes: plannedCapacity, bufferMinutes: days.reduce((n,d)=>n+d.bufferMinutes,0),
      unusedMinutes: plannedDays.reduce((n,d)=>n+d.unusedMinutes!,0), overtimeMinutes: days.reduce((n,d)=>n+d.overtimeMinutes,0),
      utilization: plannedCapacity ? plannedFocus / 60 / plannedCapacity * 100 : null,
      averageSessionMinutes: visibleSessions.length ? totalSeconds / 60 / visibleSessions.length : 0,
      legacySessions: visibleSessions.filter(s=>s.attribution==="legacy").length },
    sessions: visibleSessions.slice(0,100), sessionTotal: visibleSessions.length,
    activity: events.slice(0,500), activityTotal: events.length, reflections: intents.filter(i=>i.review).map(i=>({date:i.date,review:i.review})),
  };
}
export type Analytics = Awaited<ReturnType<typeof reviewAnalytics>>;
