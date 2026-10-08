"use client";
import { useState } from "react";
import { Task } from "@/lib/types";
export function TaskActions({ task, active, busy, onAction }: { task: Task; active?: boolean; busy?: boolean; onAction: (action: string, extras?: { reason?: string; minutes?: number }) => Promise<void> }) {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [mode, setMode] = useState<"block" | "smaller" | null>(null); const [reason, setReason] = useState("");
  const run = (action: string, extras?: { reason?: string; minutes?: number }) => { void onAction(action, extras).then(() => { setMode(null); setReason(""); }).catch(() => {}); };
  return <div><div className="actions task-actions">
    {task.column === "Done" ? <button disabled={busy} className="button-secondary" onClick={() => run("reopen")}>Reopen</button> : <>
      {!active && <select aria-label="Focus session length" value={focusMinutes} disabled={busy} onChange={(e) => setFocusMinutes(Number(e.target.value))}>{[15,25,50,90].map(m=><option key={m} value={m}>{m} min focus</option>)}</select>}
      {task.blockedReason || task.deferredUntil && new Date(task.deferredUntil) > new Date() ? <button disabled={busy} className="button" onClick={() => run("unblock")}>Make available</button> : <button disabled={busy || Boolean(task.dependsOn && task.dependsOn.column !== "Done")} className="button" onClick={() => run(active ? "pause" : "start", active ? undefined : { minutes: focusMinutes })}>{active ? "Pause focus" : "Start focus →"}</button>}
      <button disabled={busy} className="button-secondary" onClick={() => run("done")}>✓ Done</button>
      <select aria-label="Defer task" value="" disabled={busy} onChange={(e) => run("defer", { minutes: Number(e.target.value) })}><option value="" disabled>Later…</option><option value="30">In 30 minutes</option><option value="60">In an hour</option><option value="1440">In 24 hours</option></select>
      <button disabled={busy} className="button-text" onClick={() => setMode(mode === "block" ? null : "block")}>Blocked</button>
      <button disabled={busy} className="button-text" onClick={() => setMode(mode === "smaller" ? null : "smaller")}>Too big</button>
    </>}
  </div>{mode && <form className="inline-reason" onSubmit={(e) => { e.preventDefault(); run(mode, { reason, ...(mode === "smaller" ? { minutes: 15 } : {}) }); }}>
    <label>{mode === "block" ? "What needs to happen first?" : "What is a 15-minute first step?"}<input autoFocus value={reason} required maxLength={300} onChange={(e) => setReason(e.target.value)} /></label>
    <button disabled={busy || !reason.trim()} className="button-secondary">{mode === "block" ? "Mark blocked" : "Create first step"}</button><button type="button" className="button-text" onClick={() => setMode(null)}>Cancel</button>
  </form>}</div>;
}
