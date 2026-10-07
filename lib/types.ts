export type Project = { id: string; name: string; order: number; archived: boolean; version: number };
export type Goal = { id: string; title: string; importance: number; area: string; archived: boolean };
export type Task = {
  id: string; projectId: string; title: string; notes: string; priority: string; dueDate: string | null; column: string;
  orderInColumn: number; estimatedMinutes: number; energy: string; context: string; blockedReason: string | null;
  deferredUntil: string | null; completedAt: string | null; createdAt: string; version: number; goalId: string | null;
  dependsOnId: string | null; dependsOn: { id: string; title: string; column: string } | null;
  project: { name: string; archived: boolean }; goal: Goal | null;
};
export type DailyIntent = { version: number; outcomes: string[]; outcomeTaskIds: string[]; pinnedTaskIds: string[]; availableMinutes: number; bufferPercent: number; energy: string; context: string; review: string };
export type Suggestion = { task: Task; minutes: number; reasons: string[]; score: number; pinned: boolean; active: boolean; fits: boolean };
export type Today = {
  date: string; timezone: string; intent: DailyIntent; hasIntent: boolean; tasks: Task[]; projects: Project[]; goals: Goal[];
  activeSession: { id: string; taskId: string; startedAt: string } | null; spentMinutes: number; completedToday: number;
  plan: { next: Suggestion | null; alternatives: Suggestion[]; blocks: Suggestion[]; capacity: number; plannedMinutes: number; overloadMinutes: number; missingPins: string[]; excludedCount: number; message: string | null };
  activity: { id: string; taskId: string | null; action: string; detail: string; createdAt: string }[];
};
