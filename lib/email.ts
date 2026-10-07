export type DigestPayload = { from: string; to: string[]; subject: string; html: string; text: string };
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!)); }
export function digestPayload(input: { to: string; from: string; appUrl: string; date: string; outcomes: string[]; next: { title: string; minutes: number; reasons: string[] } | null; capacity: number; overload: number }): DigestPayload {
  const url = new URL(input.appUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("Invalid application URL");
  const lines = [`Your Boardo brief · ${input.date}`, "", ...input.outcomes.map((o) => "• " + o), "",
    input.next ? `Next: ${input.next.title} (~${input.next.minutes} min)` : "Choose today's outcomes and a next step.",
    ...(input.next?.reasons || []), "", `${input.capacity} minutes of planned capacity remain.`,
    input.overload ? `Chosen work exceeds capacity by ${input.overload} minutes. Consider deferring something.` : "", "", new URL("/dashboard", url).href].filter((line) => line !== "");
  const text = lines.join("\n");
  return { from: input.from, to: [input.to], subject: "Your day, with intention — Boardo",
    text, html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#263b32;max-width:580px;margin:auto;padding:24px"><h1 style="font-size:26px">A good next step.</h1><div style="white-space:pre-wrap;line-height:1.7">${escapeHtml(text)}</div><p><a href="${escapeHtml(new URL("/dashboard",url).href)}">Open your day →</a></p></body></html>` };
}
export async function sendDigest(payload: DigestPayload, idempotencyKey: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) throw new Error("Email is not configured");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id || result.error) throw new Error("Email provider rejected the request");
  return result.id as string;
}
