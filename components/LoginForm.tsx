/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions require a full reload to clear cached private route state. */
"use client";
import { useState } from "react";
import { request } from "@/lib/client";
export function LoginForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  if (!configured) return <div className="panel"><h2>Set up your private workspace</h2><p className="muted">Your administrator needs to configure private access before you can sign in. See the repository setup guide.</p></div>;
  return <form className="panel login-form" onSubmit={async (e) => { e.preventDefault(); const password = new FormData(e.currentTarget).get("password"); setBusy(true); setError("");
    try { await request("/api/auth/login", "POST", { password }); window.location.assign("/dashboard"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); setBusy(false); } }}>
    <label htmlFor="password">Your password<input id="password" name="password" type="password" autoComplete="current-password" required autoFocus maxLength={256} /></label>
    {error && <p role="alert" className="error">{error}</p>}<button disabled={busy} className="button">{busy ? "Signing in…" : "Open my workspace →"}</button><p className="small muted">Your workspace is private. Only you can access it.</p>
  </form>;
}
