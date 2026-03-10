"use client";

import { useDraggable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";

type Task = {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueDate: string | null;
  column: string;
  orderInColumn: number;
};

type SortableTaskCardProps = {
  task: Task;
  index: number;
  onEdit: () => void;
};

export function SortableTaskCard({ task, index, onEdit }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task, index, columnId: task.column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <TaskCard task={task} onEdit={onEdit} />
      </div>
    </li>
  );
}
