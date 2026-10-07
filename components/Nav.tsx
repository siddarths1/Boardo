/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions require a full reload to clear cached private route state. */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { request } from "@/lib/client";
export function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <header className="site-header"><Link href="/dashboard" className="brand"><span className="brand-mark">b</span> boardo<span className="brand-dot">.</span></Link>
    <nav aria-label="Main navigation">{[["/dashboard", "Today"], ["/tasks", "Tasks"], ["/projects/settings", "Goals & projects"], ["/review", "Review"]].map(([href, label]) =>
      <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
    <button className="button-text" onClick={async () => { try { await request("/api/auth/logout", "POST"); window.location.assign("/login"); } catch { window.location.assign("/login"); } }}>Sign out</button>
  </header>;
}
