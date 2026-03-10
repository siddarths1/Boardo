"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TaskForm } from "@/components/TaskForm";
import { TodayPriorities } from "@/components/TodayPriorities";

type Project = { id: string; name: string };
type Task = {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueDate: string | null;
  column: string;
  project?: { name: string };
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }

  async function fetchTasks() {
    const url = projectFilter
      ? `/api/tasks?projectId=${encodeURIComponent(projectFilter)}`
      : "/api/tasks";
    const res = await fetch(url);
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchTasks()]);
      setLoading(false);
    })();
  }, [projectFilter]);

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
        dueDate: data.dueDate || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to create task");
    setShowAddTask(false);
    fetchTasks();
  }

  async function handleUpdateTask(data: {
    title: string;
    projectId: string;
    priority: string;
    dueDate: string;
  }) {
    if (!editingTask) return;
    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        dueDate: data.dueDate || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    setEditingTask(null);
    fetchTasks();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Today&apos;s top priorities by project.</p>

      {/* Project filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <button
          type="button"
          onClick={() => setProjectFilter("")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            !projectFilter
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProjectFilter(p.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              projectFilter === p.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Today's priorities */}
      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900">Today&apos;s priorities</h2>
        {loading ? (
          <p className="mt-2 text-gray-500">Loading…</p>
        ) : (
          <div className="mt-3">
            <TodayPriorities
              tasks={tasks}
              onEdit={(task) => setEditingTask(task)}
            />
          </div>
        )}
      </div>

      {/* Add task */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Quick add task</h2>
        {showAddTask || editingTask ? (
          <div className="mt-2">
            <TaskForm
              projects={projects}
              initial={
                editingTask
                  ? {
                      id: editingTask.id,
                      title: editingTask.title,
                      projectId: editingTask.projectId,
                      priority: editingTask.priority,
                      dueDate: editingTask.dueDate
                        ? new Date(editingTask.dueDate).toISOString().slice(0, 10)
                        : "",
                    }
                  : undefined
              }
              onSubmit={editingTask ? handleUpdateTask : handleAddTask}
              onCancel={() => {
                setShowAddTask(false);
                setEditingTask(null);
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddTask(true)}
            className="mt-2 rounded-md border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add task
          </button>
        )}
      </div>

      {/* Project cards */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Projects</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow"
            >
              <span className="font-medium text-gray-900">{p.name}</span>
              <p className="mt-1 text-sm text-gray-500">Open Kanban board →</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
