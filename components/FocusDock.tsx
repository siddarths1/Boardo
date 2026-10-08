"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { request } from "@/lib/client";
import { Task } from "@/lib/types";
type Session = { id: string; taskId: string | null; taskTitle: string; projectName: string; startedAt: string; endedAt: string | null; limitAt: string | null; version: number };
export function FocusDock() {
  const pathname=usePathname();
  const [canResume,setCanResume]=useState(false);
  const [session,setSession]=useState<Session|null>(null),[clock,setClock]=useState(0),[offset,setOffset]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{const data=await request<{session:Session|null;canResume:boolean;serverNow:string}>("/api/focus");setSession(data.session);setCanResume(data.canResume);setOffset(Date.parse(data.serverNow)-Date.now());},[]);
  useEffect(()=>{if(pathname==="/login")return;
    const refresh=()=>void reload().catch(e=>setError(e.message)); refresh();
    const poll=setInterval(refresh,30000),tick=setInterval(()=>setClock(Date.now()),1000);
    window.addEventListener("boardo:changed",refresh); window.addEventListener("focus",refresh);
    return()=>{clearInterval(poll);clearInterval(tick);window.removeEventListener("boardo:changed",refresh);window.removeEventListener("focus",refresh);};
  },[pathname,reload]);
  if(pathname==="/login" || !session)return null;
  const now=(clock||Date.now())+offset,start=Date.parse(session.startedAt),limit=session.limitAt?Date.parse(session.limitAt):start+180*60000;
  const end=session.endedAt?Date.parse(session.endedAt):Math.min(now,limit),running=!session.endedAt&&now<limit;
  const elapsed=Math.max(0,Math.floor((end-start)/1000)),remaining=Math.max(0,Math.ceil((limit-now)/1000));
  const time=(s:number)=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
  async function act(action:string) {
    setBusy(true);setError("");
    try {
      if(action==="resume"){const tasks=await request<Task[]>("/api/tasks");const task=tasks.find(t=>t.id===session!.taskId);if(!task)throw Error("This task is no longer available.");
        await request("/api/tasks/"+task.id+"/action","POST",{action:"start",version:task.version,minutes:25});
      }else await request("/api/focus","POST",{id:session!.id,version:session!.version,action});
      await reload();window.dispatchEvent(new Event("boardo:changed"));
    }catch(e){setError(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
  }
  return <aside className="focus-dock" aria-label="Focus timer"><div><span className="eyebrow">{running?"FOCUS IN PROGRESS":session.endedAt?"FOCUS PAUSED":"SESSION LIMIT REACHED"}</span><strong>{session.taskTitle}</strong><small>{session.projectName} · {running?time(remaining)+" remaining":"Time saved. Resume when ready."}</small></div>
    <span className="timer-number" aria-label="Recorded session time">{time(elapsed)}</span>
    <div className="actions">{running?<><button disabled={busy} className="button-secondary" onClick={()=>void act("pause")}>Pause timer</button><button disabled={busy||limit-start>=180*60000} className="button-text" onClick={()=>void act("extend")}>+15 min</button></>:session.taskId&&canResume?<button disabled={busy} className="button-secondary" onClick={()=>void act("resume")}>Resume 25 min</button>:null}<a href="/review" className="small">Review time</a></div>
    {error&&<p role="alert" className="error">{error}</p>}
  </aside>;
}
