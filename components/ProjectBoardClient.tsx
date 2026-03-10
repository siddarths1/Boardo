"use client";

import { KanbanBoard } from "./KanbanBoard";

type Task = {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueDate: string | null;
  column: string;
  orderInColumn: number;
  project?: { name: string };
};

export function ProjectBoardClient({
  projectId,
  projectName,
  initialTasks,
}: {
  projectId: string;
  projectName: string;
  initialTasks: Task[];
}) {
  return (
    <KanbanBoard
      projectId={projectId}
      projectName={projectName}
      initialTasks={initialTasks}
      onTasksChange={() => {}}
    />
  );
}
