"use client";
import { useState } from "react";
import { request } from "@/lib/client";
import { Today } from "@/lib/types";
import { ReviewAnalytics } from "./ReviewAnalytics";
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
    <ReviewAnalytics today={data.date} onRange={() => {}} />
    <div className="daily-reflection"><ReviewForm key={data.date} data={data} busy={busy} save={(review, carryTaskIds) => mutate(() => request("/api/review", "PUT", { review, carryTaskIds, version: data.intent.version }))} /></div>
  </div>;
}
