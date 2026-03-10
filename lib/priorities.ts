export type TaskWithProject = {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  column: string;
  orderInColumn: number;
  project?: { name: string };
};

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function toDateOnlyKey(d: Date | null): number {
  if (!d) return Number.MAX_SAFE_INTEGER;
  const t = new Date(d);
  return t.getFullYear() * 10000 + t.getMonth() * 100 + t.getDate();
}

const todayKey = () => {
  const t = new Date();
  return t.getFullYear() * 10000 + t.getMonth() * 100 + t.getDate();
};

export function sortTasksByPriorityAndDue<T extends TaskWithProject>(tasks: T[]): T[] {
  const today = todayKey();
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    const da = toDateOnlyKey(a.dueDate ? new Date(a.dueDate) : null);
    const db = toDateOnlyKey(b.dueDate ? new Date(b.dueDate) : null);
    // Overdue and today first: lower date key = earlier
    const aScore = da <= today ? da : today + 100000 + da;
    const bScore = db <= today ? db : today + 100000 + db;
    return aScore - bScore;
  });
}
