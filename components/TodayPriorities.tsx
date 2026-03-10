"use client";

import Link from "next/link";

type Task = {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueDate: string | null;
  column: string;
  project?: { name: string };
};

type TodayPrioritiesProps = {
  tasks: Task[];
  onEdit?: (task: Task) => void;
};

export function TodayPriorities({ tasks, onEdit }: TodayPrioritiesProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-4 text-center text-gray-500">
        No active tasks. Add a task or filter by another project.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-900">{task.title}</span>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {task.project?.name && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5">{task.project.name}</span>
              )}
              <span
                className={
                  task.priority === "High"
                    ? "text-red-600"
                    : task.priority === "Low"
                      ? "text-gray-500"
                      : "text-amber-600"
                }
              >
                {task.priority}
              </span>
              {task.dueDate && (
                <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Edit
              </button>
            )}
            <Link
              href={`/projects/${task.projectId}`}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Open board
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
