"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@/lib/client";
import { Today } from "@/lib/types";
export function useToday() {
  const [data, setData] = useState<Today | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const generation = useRef(0); const changing = useRef(false);
  const reload = useCallback(async () => { const ticket = ++generation.current; const next = await request<Today>("/api/today"); if (ticket === generation.current) setData(next); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const ticket = ++generation.current;
    request<Today>("/api/today", "GET", undefined, controller.signal).then((next) => { if (ticket === generation.current) setData(next); }).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    const refresh = () => { if (!changing.current) void reload().catch((e) => setError(e.message)); };
    window.addEventListener("boardo:changed", refresh);
    const interval = setInterval(() => { if (!changing.current && document.visibilityState === "visible") void reload().catch((e) => setError(e.message)); }, 60000);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener("boardo:changed", refresh); };
  }, [reload]);
  async function mutate(fn: () => Promise<unknown>) {
    changing.current = true; generation.current++; setBusy(true); setError("");
    try { await fn(); await reload(); window.dispatchEvent(new Event("boardo:changed")); }
    catch (e) { setError(e instanceof Error ? e.message : "Please retry."); throw e; }
    finally { changing.current = false; setBusy(false); }
  }
  return { data, error, busy, reload, mutate, setError };
}
