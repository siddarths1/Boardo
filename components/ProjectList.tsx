"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Project = { id: string; name: string; order: number; archived: boolean };

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    function onRefresh() {
      fetchProjects();
    }
    window.addEventListener("projects-refresh", onRefresh);
    return () => window.removeEventListener("projects-refresh", onRefresh);
  }, []);

  async function handleReorder(projectId: string, direction: "up" | "down") {
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx < 0) return;
    const newOrder = direction === "up" ? idx - 1 : idx + 1;
    if (newOrder < 0 || newOrder >= projects.length) return;
    const reordered = [...projects];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(newOrder, 0, removed);
    setProjects(reordered);
    await Promise.all(
      reordered.map((p, i) =>
        fetch(`/api/projects/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: i }),
        })
      )
    );
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchProjects();
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this project? Its tasks will remain but the project will be hidden from lists.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) fetchProjects();
  }

  if (loading) return <p className="text-gray-500">Loading projects…</p>;

  return (
    <ul className="space-y-2">
      {projects.map((project, idx) => (
        <li
          key={project.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">#{idx + 1}</span>
            {editingId === project.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRename(project.id)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setEditName(""); }}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-900">{project.name}</span>
                <button
                  type="button"
                  onClick={() => { setEditingId(project.id); setEditName(project.name); }}
                  className="text-sm text-gray-500 hover:text-indigo-600"
                >
                  Rename
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleReorder(project.id, "up")}
              disabled={idx === 0}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleReorder(project.id, "down")}
              disabled={idx === projects.length - 1}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              aria-label="Move down"
            >
              ↓
            </button>
            <Link
              href={`/projects/${project.id}`}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Open board
            </Link>
            <button
              type="button"
              onClick={() => handleArchive(project.id)}
              className="rounded p-1.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-700"
            >
              Archive
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
