"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <div className="empty-state"><h1>Let&apos;s try that again.</h1><p>Your workspace could not load. Retry in a moment. If this continues, check the database and deployment configuration.</p><button className="button" onClick={reset}>Retry</button></div>;
}
