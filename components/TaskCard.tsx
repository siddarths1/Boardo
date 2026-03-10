"use client";

import Link from "next/link";

type Task = {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  column: string;
};

type TaskCardProps = {
  task: Task;
  onEdit?: () => void;
};

export function TaskCard({ task, onEdit }: TaskCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <p className="font-medium text-gray-900">{task.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
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
          <span className="text-gray-500">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 text-sm text-indigo-600 hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}
