"use client";
import Link from "next/link";
import { useState } from "react";
import { request } from "@/lib/client";
import { DailyIntent, Task, Today } from "@/lib/types";
import { useToday } from "./useToday";
import { TaskActions } from "./TaskActions";
import { TaskForm } from "./TaskForm";

function IntentEditor({ data, busy, save }: { data: Today; busy: boolean; save: (intent: DailyIntent) => Promise<void> }) {
  const [draft, setDraft] = useState(data.intent); const [outcomes, setOutcomes] = useState(data.intent.outcomes.join("\n")); const [open, setOpen] = useState(!data.hasIntent);
  return <section className="panel intent-panel"><div className="section-heading"><div><p className="eyebrow">SET YOUR DIRECTION</p><h2>What matters today?</h2></div><button className="button-text" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Collapse" : "Adjust day"}</button></div>
    {!open ? <><ul className="outcomes">{data.intent.outcomes.length ? data.intent.outcomes.map((o, i) => <li key={i}><span>{String(i + 1).padStart(2, "0")}</span>{o}</li>) : <li>Choose up to three outcomes to give your day direction.</li>}</ul><p className="small muted">{data.intent.availableMinutes} minutes available · {data.intent.energy} energy · {data.intent.context} · {data.intent.bufferPercent}% breathing room</p></> :
    <form onSubmit={(e) => { e.preventDefault(); void save({ ...draft, outcomes: outcomes.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3) }).then(() => setOpen(false)).catch(() => {}); }}>
      <label>One to three outcomes<textarea rows={3} value={outcomes} maxLength={602} onChange={(e) => setOutcomes(e.target.value)} placeholder={"Finish the proposal draft\nMake time for a walk"} /></label>
      <div className="form-grid"><label>Available minutes today<input type="number" min={0} max={720} step={5} value={draft.availableMinutes} onChange={(e) => setDraft({ ...draft, availableMinutes: Number(e.target.value) })} /></label>
      <label>Energy<select value={draft.energy} onChange={(e) => setDraft({ ...draft, energy: e.target.value })}>{["Low", "Medium", "High"].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Current context<select value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })}>{["Desk", "Phone", "Outside", "Any"].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Buffer %<input type="number" min={0} max={50} value={draft.bufferPercent} onChange={(e) => setDraft({ ...draft, bufferPercent: Number(e.target.value) })} /></label></div>
      <fieldset><legend>Choose up to three tasks that support those outcomes</legend><div className="choice-list">{data.tasks.filter((t) => t.column !== "Done").map((task) => <label key={task.id} className="check-row"><input type="checkbox" checked={draft.outcomeTaskIds.includes(task.id)} disabled={!draft.outcomeTaskIds.includes(task.id) && draft.outcomeTaskIds.length >= 3} onChange={(e) => setDraft({ ...draft, outcomeTaskIds: e.target.checked ? [...draft.outcomeTaskIds, task.id] : draft.outcomeTaskIds.filter((id) => id !== task.id) })} />{task.title}</label>)}</div></fieldset>
      <button className="button" disabled={busy}>Save my day →</button><p className="small muted">Available time is your total for today. Logged focus time is deducted automatically.</p>
    </form>}
  </section>;
}

export function TodayClient() {
  const { data, error, busy, reload, mutate, setError } = useToday(); const [capture, setCapture] = useState(false);
  const act = (task: Task, action: string, extras?: { reason?: string; minutes?: number }) => mutate(() => request(`/api/tasks/${task.id}/action`, "POST", { action, version: task.version, ...extras }));
  if (!data) return <div className="empty-state"><h1>Your day, coming into focus.</h1><p>{error || "Loading your workspace…"}</p>{error && <button className="button" onClick={() => void reload().catch((e) => setError(e.message))}>Retry</button>}</div>;
  const next = data.plan.next;
  const pin = (id: string) => mutate(() => request("/api/daily-intent", "PUT", { ...data.intent, pinnedTaskIds: data.intent.pinnedTaskIds.includes(id) ? data.intent.pinnedTaskIds.filter((p) => p !== id) : [...data.intent.pinnedTaskIds, id] }));
  const saveIntent = (intent: DailyIntent) => mutate(() => request("/api/daily-intent", "PUT", intent));
  return <div><div className="page-heading"><div><p className="eyebrow">{new Date(data.date + "T12:00:00Z").toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })} <span className="subtle">/ {data.timezone}</span></p><h1>A little clarity.<br /><span className="serif">A good next step.</span></h1></div><button className="button-secondary" onClick={() => setCapture(!capture)}>＋ Capture a task</button></div>
    {error && <div role="alert" className="error banner">{error}<button className="button-text" onClick={() => void reload().then(() => setError("")).catch((e) => setError(e.message))}>Refresh</button></div>}
    {capture && <section className="panel capture-panel"><div className="section-heading"><h2>Get it out of your head.</h2><button className="button-text" onClick={() => setCapture(false)}>Close</button></div><TaskForm projects={data.projects} goals={data.goals} tasks={data.tasks} onSubmit={async (input) => { await mutate(() => request("/api/tasks", "POST", input)); setCapture(false); }} /></section>}
    <div className="today-grid"><div className="main-stack"><IntentEditor key={data.date + ":" + data.intent.version} data={data} busy={busy} save={saveIntent} />
      <section className="now-card"><div className="section-heading"><p className="eyebrow"><span className="status-dot" /> {next?.active ? "IN FOCUS" : "YOUR NEXT MOVE"}</p><span className="small">{next ? `~${next.minutes} min` : "A moment to reset"}</span></div>
        {next ? <><span className="pill">{next.task.project.name}{next.task.goal ? ` / ${next.task.goal.area}` : ""}</span><h2>{next.task.title}</h2><ul className="reason-list">{next.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{next.task.notes && <p className="next-notes">{next.task.notes}</p>}
        <TaskActions task={next.task} active={next.active} busy={busy} onAction={(action, extras) => act(next.task, action, extras)} />
        {next.active && <p className="small">Focus started at {new Date(data.activeSession!.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Pause when interrupted.</p>}</> : <><h2>{data.tasks.length ? "Make a little space." : "Start with what matters."}</h2><p>{data.plan.message}</p>{!data.tasks.length && <p><Link href="/projects/settings">Create your first project</Link>, then capture a few concrete tasks.</p>}</>}
      </section>
      {data.plan.alternatives.length > 0 && <section><div className="section-heading"><h2>Or, another way forward</h2><span className="small muted">You choose.</span></div><div className="alternatives">{data.plan.alternatives.map((item) => <article className="panel" key={item.task.id}><p className="eyebrow">{item.minutes} MIN / {item.task.context}</p><h3>{item.task.title}</h3><p className="small muted">{item.reasons[0]}</p><button className="button-text" disabled={busy} onClick={() => void act(item.task, "start").catch(() => {})}>Start this instead →</button></article>)}</div></section>}
    </div><aside className="side-stack"><section className="panel day-plan"><p className="eyebrow">ROOM IN YOUR DAY</p><div className="capacity-number">{data.plan.capacity}<span>min left</span></div><div className="capacity-track"><span style={{ width: `${Math.min(100, data.plan.plannedMinutes / Math.max(1, data.plan.capacity) * 100)}%` }} /></div><p className="small muted">{data.spentMinutes} min focused · {data.completedToday} tasks finished</p>
      {data.plan.overloadMinutes > 0 && <p className="notice">Your chosen work exceeds capacity by {data.plan.overloadMinutes} minutes. Unpin or defer something to make room.</p>}
      <div className="section-heading"><h2>A realistic sequence</h2><span className="small muted">Suggested</span></div>
      <ol className="plan-list">{data.plan.blocks.map((block, index) => <li key={block.task.id}><span className="plan-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{block.task.title}</strong><p className="small muted">{block.minutes} min{block.active ? " · in focus" : ""}{!block.fits ? " · check time / context" : ""}</p></div><button className={block.pinned ? "pin pinned" : "pin"} aria-label={`${block.pinned ? "Unpin" : "Pin"} ${block.task.title}`} title={block.pinned ? "Unpin task" : "Keep in today's plan"} disabled={busy} onClick={() => void pin(block.task.id).catch(() => {})}>{block.pinned ? "●" : "○"}</button></li>)}</ol>
      {!data.plan.blocks.length && <p className="muted">Your plan will appear when tasks fit your available time.</p>}{data.plan.missingPins.length > 0 && <p className="small notice">Some pinned work is finished, blocked or deferred. It is excluded until actionable.</p>}
      <p className="small muted">Pin a task to keep it in this plan. Times are estimates, with your buffer reserved.</p>
    </section><section className="quiet-card"><span className="decorative">↗</span><h3>Progress, with perspective.</h3><p>A good day is about moving the right things forward.</p><Link href="/review">Reflect on today →</Link></section></aside></div>
  </div>;
}
