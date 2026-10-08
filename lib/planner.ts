export type PlanningTask = {
  id: string; title: string; priority: string; dueDate: Date | string | null; column: string;
  estimatedMinutes: number; energy: string; context: string; blockedReason: string | null;
  deferredUntil: Date | string | null; createdAt: Date | string;
  project: { archived: boolean }; goal?: { importance: number; title: string; archived: boolean } | null;
  dependsOn?: { column: string } | null;
};
export type Intent = { availableMinutes: number; bufferPercent: number; energy: string; context: string; outcomeTaskIds: string[]; pinnedTaskIds: string[] };
export function localDate(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
const levels: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
export function localDayRange(now: Date, timezone: string) {
  const date = localDate(now, timezone);
  const tomorrow = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const boundary = (target: string) => {
    let low = Date.parse(target) - 36 * 3600000, high = Date.parse(target) + 36 * 3600000;
    while (high - low > 1) { const mid = Math.floor((low + high) / 2); if (formatter.format(new Date(mid)) < target) low = mid; else high = mid; }
    return high;
  };
  return { start: boundary(date), end: boundary(tomorrow) };
}
export function planDay<T extends PlanningTask>(tasks: T[], intent: Intent, options: { now: Date; timezone: string; spentMinutes: number; activeTaskId?: string; taskMinutes?: Record<string, number> }) {
  const today = localDate(options.now, options.timezone);
  const capacity = Math.max(0, Math.floor(intent.availableMinutes * (1 - intent.bufferPercent / 100)) - options.spentMinutes);
  const candidates = tasks.filter((task) => task.column !== "Done" && !task.project.archived && !task.blockedReason &&
    (!task.deferredUntil || new Date(task.deferredUntil) <= options.now) && (!task.dependsOn || task.dependsOn.column === "Done"))
    .map((task) => {
      const reasons: string[] = [];
      let score = ({ High: 30, Medium: 15, Low: 5 } as Record<string, number>)[task.priority] || 0;
      const minutes = Math.max(5, task.estimatedMinutes - (options.taskMinutes?.[task.id] || 0));
      if (intent.outcomeTaskIds.includes(task.id)) { score += 60; reasons.push("One of your chosen outcomes today"); }
      if (task.goal && !task.goal.archived) { score += task.goal.importance * 5; reasons.push(`Supports ${task.goal.title}`); }
      if (task.dueDate) {
        const date = new Date(task.dueDate).toISOString().slice(0, 10);
        const days = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
        if (days < 0) { score += 80 + Math.min(20, -days); reasons.push("Past its due date"); }
        else if (days === 0) { score += 75; reasons.push("Due today"); }
        else if (days === 1) { score += 45; reasons.push("Due tomorrow"); }
      }
      if (task.column === "InProgress") { score += 15; reasons.push("Continue work already in progress"); }
      score += Math.min(15, Math.max(0, (options.now.getTime() - new Date(task.createdAt).getTime()) / 86400000));
      const fitsEnergy = (levels[task.energy] || 2) <= (levels[intent.energy] || 2);
      const fitsContext = task.context === "Any" || intent.context === "Any" || task.context === intent.context;
      const fits = fitsEnergy && fitsContext && minutes <= capacity;
      if (fits) { score += 10; reasons.push(`Fits your ${intent.energy.toLowerCase()} energy and available time`); }
      if (!reasons.length) reasons.push(`${task.priority} priority; about ${minutes} minutes`);
      return { task, minutes, score, reasons, fits, fitsEnergy, fitsContext, pinned: intent.pinnedTaskIds.includes(task.id), active: task.id === options.activeTaskId };
    }).sort((a, b) => Number(b.active) - Number(a.active) || Number(b.pinned) - Number(a.pinned) || b.score - a.score || a.task.id.localeCompare(b.task.id));
  const feasible = candidates.filter((c) => c.active || c.fits);
  const next = feasible[0] || null;
  const blocks: typeof candidates = [];
  let used = 0;
  for (const candidate of candidates) {
    if (candidate.pinned || candidate.active || (candidate.fitsEnergy && candidate.fitsContext && used + candidate.minutes <= capacity)) {
      blocks.push(candidate); used += candidate.minutes;
    }
  }
  const requested = candidates.filter((c) => intent.outcomeTaskIds.includes(c.task.id) || c.pinned || c.active);
  const requestedMinutes = requested.reduce((sum, c) => sum + c.minutes, 0);
  const missingPins = intent.pinnedTaskIds.filter((id) => !candidates.some((c) => c.task.id === id));
  return { next, alternatives: feasible.filter((c) => c.task.id !== next?.task.id).slice(0, 2), blocks, capacity,
    plannedMinutes: used, overloadMinutes: Math.max(0, requestedMinutes - capacity, used - capacity), missingPins,
    excludedCount: tasks.filter((t) => t.column !== "Done").length - candidates.length,
    message: next ? null : capacity === 0 ? "Your planned capacity is used. Take a break or adjust today's available time." : "Nothing fits right now. Try a smaller step, unblock a task, or adjust your context." };
}
