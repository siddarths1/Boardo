"use client";
import { useState } from "react";
import { request } from "@/lib/client";
import { Today } from "@/lib/types";
import { useToday } from "./useToday";
function ReviewForm({ data, busy, save }: { data: Today; busy: boolean; save: (review: string, carryTaskIds: string[]) => Promise<void> }) {
  const [review, setReview] = useState(data.intent.review); const [carry, setCarry] = useState<string[]>([]); const [saved, setSaved] = useState(false);
  return <form className="panel" onSubmit={(e) => { e.preventDefault(); void save(review, carry).then(() => setSaved(true)).catch(() => {}); }}><h2>Close the day with intention.</h2><label>What moved forward? What should change tomorrow?<textarea rows={6} value={review} maxLength={4000} onChange={(e) => { setReview(e.target.value); setSaved(false); }} placeholder="A win, a surprise, and one thing to do differently…" /></label>
    <fieldset><legend>Carry up to three unfinished tasks into tomorrow&apos;s outcomes</legend><div className="choice-list">{data.tasks.filter((t) => t.column !== "Done").map((task) => <label className="check-row" key={task.id}><input type="checkbox" checked={carry.includes(task.id)} disabled={!carry.includes(task.id) && carry.length >= 3} onChange={(e) => setCarry(e.target.checked ? [...carry, task.id] : carry.filter((id) => id !== task.id))} />{task.title}</label>)}</div></fieldset>
    <button className="button" disabled={busy}>{busy ? "Saving…" : "Save reflection"}</button>{saved && <p role="status" className="success">Reflection saved. Selected tasks are included in tomorrow&apos;s outcomes.</p>}
  </form>;
}
export function ReviewClient() {
  const { data, error, busy, mutate, reload, setError } = useToday();
  if (!data) return <div className="empty-state"><h1>A moment to reflect.</h1><p>{error || "Loading today's progress…"}</p>{error && <button onClick={() => void reload().catch((e) => setError(e.message))}>Retry</button>}</div>;
  return <div><div className="page-heading"><div><p className="eyebrow">{data.date} / DAILY REVIEW</p><h1>See how far you came.</h1></div></div>{error && <p role="alert" className="error">{error}</p>}
    <div className="stat-grid"><div className="panel"><span className="stat-number">{data.completedToday}</span><p>tasks completed today</p></div><div className="panel"><span className="stat-number">{data.spentMinutes}<small> min</small></span><p>logged focus time</p></div><div className="panel"><span className="stat-number">{data.tasks.filter((t) => data.intent.outcomeTaskIds.includes(t.id) && t.column === "Done").length}<small> / {data.intent.outcomeTaskIds.length}</small></span><p>chosen tasks completed</p></div></div>
    <div className="today-grid"><ReviewForm key={data.date} data={data} busy={busy} save={(review, carryTaskIds) => mutate(() => request("/api/review", "PUT", { review, carryTaskIds, version: data.intent.version }))} />
    <section className="panel"><h2>The shape of your day</h2><ol className="activity-list">{data.activity.map((event) => <li key={event.id}><span className="small muted">{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><div><strong>{event.action === "done" ? "Completed" : event.action.replace(/^./, (s) => s.toUpperCase())}</strong><p>{data.tasks.find((t) => t.id === event.taskId)?.title || "Workspace update"}</p>{event.detail && <p className="small muted">{event.detail}</p>}</div></li>)}</ol>{!data.activity.length && <p className="muted">Start a task or mark progress to build your daily record.</p>}</section></div>
  </div>;
}
