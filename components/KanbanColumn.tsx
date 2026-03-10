"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { SortableTaskCard } from "./SortableTaskCard";

type Task = {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueDate: string | null;
  column: string;
  orderInColumn: number;
};

type KanbanColumnProps = {
  columnId: string;
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
};

export function KanbanColumn({ columnId, title, tasks, onEdit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId, data: { columnId } });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] flex-shrink-0 rounded-lg border-2 bg-gray-50/50 p-3 ${
        isOver ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200"
      }`}
    >
      <h3 className="mb-3 font-medium text-gray-900">{title}</h3>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              index={index}
              onEdit={() => onEdit(task)}
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  );
}
