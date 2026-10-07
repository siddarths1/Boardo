"use client";
import { useId, useState } from "react";
import { Task, Project, Goal } from "@/lib/types";
export type TaskInput = { title: string; projectId: string; priority: string; dueDate: string | null; goalId: string | null; dependsOnId: string | null; notes: string; estimatedMinutes: number; energy: string; context: string };
export function TaskForm({ projects, goals = [], tasks = [], initial, onSubmit, onCancel }: {
  projects: Pick<Project, "id" | "name">[]; goals?: Goal[]; tasks?: Task[]; initial?: Partial<Task>;
  onSubmit: (data: TaskInput) => Promise<void>; onCancel?: () => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<TaskInput>({ title: initial?.title || "", projectId: initial?.projectId || projects[0]?.id || "",
    priority: initial?.priority || "Medium", dueDate: initial?.dueDate?.slice(0,10) || null, goalId: initial?.goalId || null,
    dependsOnId: initial?.dependsOnId || null, notes: initial?.notes || "", estimatedMinutes: initial?.estimatedMinutes || 30,
    energy: initial?.energy || "Medium", context: initial?.context || "Any" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const change = (key: keyof TaskInput, value: string | number | null) => setForm((old) => ({ ...old, [key]: value }));
  return <form className="task-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSubmit({ ...form, projectId: form.projectId || projects[0]?.id || "", title: form.title.trim() }); if (!initial?.id) setForm((old) => ({ ...old, title: "", notes: "", dueDate: null })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  }}>
    <label htmlFor={uid + "title"} className="full-width">Next action<input id={uid + "title"} autoFocus value={form.title} maxLength={300} required placeholder="What is the next concrete step?" onChange={(e) => change("title", e.target.value)} /></label>
    <label htmlFor={uid + "project"}>Project<select id={uid + "project"} value={form.projectId || projects[0]?.id || ""} onChange={(e) => change("projectId", e.target.value)} required>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label htmlFor={uid + "goal"}>Supports a goal<select id={uid + "goal"} value={form.goalId || ""} onChange={(e) => change("goalId", e.target.value || null)}><option value="">No goal yet</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
    <label htmlFor={uid + "minutes"}>Estimated minutes<input id={uid + "minutes"} type="number" min={5} max={720} step={5} value={form.estimatedMinutes} onChange={(e) => change("estimatedMinutes", Number(e.target.value))} required /></label>
    <label htmlFor={uid + "priority"}>Importance<select id={uid + "priority"} value={form.priority} onChange={(e) => change("priority", e.target.value)}>{["High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select></label>
    <label htmlFor={uid + "energy"}>Energy needed<select id={uid + "energy"} value={form.energy} onChange={(e) => change("energy", e.target.value)}>{["High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select></label>
    <label htmlFor={uid + "context"}>Where can you do it?<select id={uid + "context"} value={form.context} onChange={(e) => change("context", e.target.value)}>{["Any", "Desk", "Phone", "Outside"].map((x) => <option key={x}>{x}</option>)}</select></label>
    <label htmlFor={uid + "due"}>Due date<input id={uid + "due"} type="date" value={form.dueDate || ""} onChange={(e) => change("dueDate", e.target.value || null)} /></label>
    <label htmlFor={uid + "dependency"}>Do after<select id={uid + "dependency"} value={form.dependsOnId || ""} onChange={(e) => change("dependsOnId", e.target.value || null)}><option value="">Ready independently</option>{tasks.filter((t) => t.id !== initial?.id && t.column !== "Done").map((t) => <option value={t.id} key={t.id}>{t.title}</option>)}</select></label>
    <label htmlFor={uid + "notes"} className="full-width">Notes<textarea id={uid + "notes"} value={form.notes} maxLength={4000} rows={2} onChange={(e) => change("notes", e.target.value)} placeholder="A useful link, a first step, or a definition of done." /></label>
    {error && <p role="alert" className="error full-width">{error}</p>}
    {!projects.length && <p className="muted full-width">Create a project in Goals & projects to add your first task.</p>}
    <div className="actions full-width"><button className="button" disabled={busy || !projects.length}>{busy ? "Saving…" : initial?.id ? "Save changes" : "Add task"}</button>{onCancel && <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}
