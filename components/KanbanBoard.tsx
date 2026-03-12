"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { TaskForm } from "./TaskForm";

const COLUMNS = [
  { id: "Todo", title: "To Do" },
  { id: "InProgress", title: "In Progress" },
  { id: "Done", title: "Done" },
] as const;
const COLUMN_IDS = COLUMNS.map((c) => c.id);

type Project = { id: string; name: string };
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

type KanbanBoardProps = {
  projectId: string;
  projectName: string;
  initialTasks: Task[];
  onTasksChange: () => void;
};

export function KanbanBoard({
  projectId,
  projectName,
  initialTasks,
  onTasksChange,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  async function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over) return;
    // Don't treat drop on self as a move
    if (over.id === active.id) return;

    const taskId = active.id as string;
    const overData = over.data.current as { columnId?: string; index?: number } | undefined;
    // Resolve target column: from droppable/sortable data, or from over.id when it's a column
    const newColumn =
      overData?.columnId ?? (COLUMN_IDS.includes(over.id as string) ? (over.id as string) : null);
    if (!newColumn) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newIndex = typeof overData?.index === "number" ? overData.index : 0;

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column: newColumn,
        orderInColumn: newIndex,
      }),
    });
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, column: newColumn, orderInColumn: newIndex } : t
        )
      );
      onTasksChange();
    }
  }

  async function handleAddTask(data: {
    title: string;
    projectId: string;
    priority: string;
    dueDate: string;
  }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        projectId,
        dueDate: data.dueDate || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to create task");
    const created = await res.json();
    setTasks((prev) => [...prev, created]);
    onTasksChange();
  }

  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks
        .filter((t) => t.column === col.id)
        .sort((a, b) => a.orderInColumn - b.orderInColumn);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              title={col.title}
              tasks={tasksByColumn[col.id] ?? []}
              onEdit={(task) => setEditingTask(task)}
            />
          ))}
        </div>
      </DndContext>

      <div className="mt-6 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900">Add task to {projectName}</h3>
        <div className="mt-2">
          <TaskForm
            projects={[{ id: projectId, name: projectName }]}
            onSubmit={handleAddTask}
          />
        </div>
      </div>

      {editingTask && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">Edit task</h3>
          <TaskForm
            projects={[{ id: projectId, name: projectName }]}
            initial={{
              id: editingTask.id,
              title: editingTask.title,
              projectId: editingTask.projectId,
              priority: editingTask.priority,
              dueDate: editingTask.dueDate
                ? new Date(editingTask.dueDate).toISOString().slice(0, 10)
                : "",
            }}
            onSubmit={async (data) => {
              const res = await fetch(`/api/tasks/${editingTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...data,
                  dueDate: data.dueDate || null,
                }),
              });
              if (!res.ok) throw new Error("Failed to update");
              const updated = await res.json();
              setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
              setEditingTask(null);
              onTasksChange();
            }}
            onCancel={() => setEditingTask(null)}
          />
        </div>
      )}
    </div>
  );
}
