import { focusEnd } from "./time-metrics";
import { User } from "@prisma/client";
import { prisma } from "./db";
import { listTasks } from "./tasks";
import { localDate, localDayRange, planDay } from "./planner";

export async function todayData(user: User) {
  const now = new Date();
  const date = localDate(now, user.timezone);
  const day = localDayRange(now, user.timezone);
  const [tasks, saved, sessions, events, projects, goals] = await Promise.all([
    listTasks(user.id),
    prisma.dailyIntent.findUnique({ where: { userId_date: { userId: user.id, date } } }),
    prisma.focusSession.findMany({ where: { userId: user.id, OR: [{ endedAt: { gte: new Date(day.start) } }, { endedAt: null }] } }),
    prisma.activityEvent.findMany({ where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - 2 * 86400000) } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.project.findMany({ where: { userId: user.id, archived: false }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.goal.findMany({ where: { userId: user.id, archived: false }, orderBy: { importance: "desc" } }),
  ]);
  const source = saved || { version: 0, outcomes: [] as string[], outcomeTaskIds: [] as string[], pinnedTaskIds: [] as string[], availableMinutes: 240, bufferPercent: 20, energy: "Medium", context: "Desk", review: "" };
  const intent = { version: source.version, outcomes: source.outcomes, outcomeTaskIds: source.outcomeTaskIds, pinnedTaskIds: source.pinnedTaskIds, availableMinutes: source.availableMinutes, bufferPercent: source.bufferPercent, energy: source.energy, context: source.context, review: source.review };
  // Split each session by local-day boundaries, including a session across midnight.
  let spentMinutes = 0;
  const taskMinutes: Record<string, number> = {};
  for (const session of sessions) {
    const end = new Date(focusEnd(session, now));
    const minutesToday = Math.max(0, Math.min(end.getTime(), day.end) - Math.max(session.startedAt.getTime(), day.start)) / 60000;
    spentMinutes += minutesToday;
    if (session.taskId) taskMinutes[session.taskId] = (taskMinutes[session.taskId] || 0) + minutesToday;
  }
  for (const id of Object.keys(taskMinutes)) taskMinutes[id] = Math.floor(taskMinutes[id]);
  const active = sessions.find((s) => !s.endedAt && focusEnd(s, now) >= now.getTime()) || null;
  const plan = planDay(tasks, intent, { now, timezone: user.timezone, spentMinutes: Math.floor(spentMinutes), activeTaskId: active?.taskId || undefined, taskMinutes });
  const todayEvents = events.filter((e) => localDate(e.createdAt, user.timezone) === date);
  return { date, timezone: user.timezone, intent, hasIntent: Boolean(saved?.capacityConfirmed), tasks, projects, goals, plan, activeSession: active,
    spentMinutes: Math.floor(spentMinutes), completedToday: tasks.filter((t) => t.completedAt && localDate(t.completedAt, user.timezone) === date).length, activity: todayEvents };
}
