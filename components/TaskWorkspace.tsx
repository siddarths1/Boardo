"use client";
import { useState } from "react";
import { request } from "@/lib/client";
import { Task } from "@/lib/types";
import { TaskForm } from "./TaskForm";
import { TaskActions } from "./TaskActions";
import { useToday } from "./useToday";
export function TaskWorkspace() {
  const { data, error, busy, reload, mutate, setError } = useToday();
  const [query, setQuery] = useState(""); const [project, setProject] = useState(""); const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<Task | null>(null); const [adding, setAdding] = useState(false);
  if (!data) return <div className="empty-state"><h1>Your tasks</h1><p>{error || "Loading…"}</p>{error && <button onClick={() => void reload().catch((e) => setError(e.message))}>Retry</button>}</div>;
  const visible = data.tasks.filter((t) => (!project || t.projectId === project) && t.title.toLowerCase().includes(query.toLowerCase()) && (status === "all" || (status === "done" ? t.column === "Done" : t.column !== "Done")));
  return <div><div className="page-heading"><div><p className="eyebrow">CAPTURE · CLARIFY · MOVE FORWARD</p><h1>Everything on your mind.</h1></div><button className="button" onClick={() => { setAdding(!adding); setEditing(null); }}>＋ Add task</button></div>
    {error && <p role="alert" className="error">{error}</p>}
    {(adding || editing) && <section className="panel capture-panel"><h2>{editing ? "Refine your next step" : "Capture a next step"}</h2><TaskForm key={editing?.id || "new"} initial={editing || undefined} projects={data.projects} goals={data.goals} tasks={data.tasks} onCancel={() => { setEditing(null); setAdding(false); }} onSubmit={async (input) => {
      await mutate(() => request(editing ? `/api/tasks/${editing.id}` : "/api/tasks", editing ? "PATCH" : "POST", editing ? { ...input, version: editing.version } : input)); setEditing(null); setAdding(false);
    }} /></section>}
    <div className="filters"><input aria-label="Search tasks" placeholder="Search your tasks…" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter project" value={project} onChange={(e) => setProject(e.target.value)}><option value="">All projects</option>{data.projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select><select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active</option><option value="done">Completed</option><option value="all">Everything</option></select></div>
    <div className="task-list">{visible.map((task) => <article className="panel task-row" key={task.id}><div className="section-heading"><div><p className="eyebrow">{task.project.name} / {task.goal?.title || task.priority + " importance"}</p><h2>{task.title}</h2><p className="small muted">{task.estimatedMinutes} min · {task.energy} energy · {task.context}{task.dueDate ? ` · due ${task.dueDate.slice(0,10)}` : ""}</p></div><button className="button-text" onClick={() => { setEditing(task); setAdding(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button></div>
      {task.blockedReason && <p className="notice">Blocked: {task.blockedReason}</p>}{task.dependsOn && task.dependsOn.column !== "Done" && <p className="notice">Waiting for: {task.dependsOn.title}</p>}{task.deferredUntil && new Date(task.deferredUntil) > new Date() && <p className="small muted">Available after {new Date(task.deferredUntil).toLocaleString()}</p>}
      <TaskActions task={task} active={data.activeSession?.taskId === task.id} busy={busy} onAction={(action, extras) => mutate(() => request(`/api/tasks/${task.id}/action`, "POST", { action, version: task.version, ...extras }))} />
    </article>)}</div>{!visible.length && <div className="empty-state"><h2>A little breathing room.</h2><p>No tasks match this view. Capture a next step when you are ready.</p></div>}
  </div>;
}
