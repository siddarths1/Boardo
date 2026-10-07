import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { digestPayload, sendDigest } from "../lib/email";
test("email escapes titles and outcomes, and includes a text alternative", () => {
  const payload = digestPayload({ to: "test@example.invalid", from: "test@example.invalid", appUrl: "https://example.invalid", date: "2026-10-06", outcomes: ["<img src=x>"], next: { title: "<b>Title</b>", minutes: 15, reasons: ["A & B"] }, capacity: 60, overload: 0 });
  assert.ok(!payload.html.includes("<img src=x>")); assert.ok(payload.html.includes("&lt;b&gt;Title&lt;/b&gt;")); assert.match(payload.text, /<b>Title<\/b>/);
});
test("email rejects unsafe application URLs", () => { assert.throws(() => digestPayload({ to: "a", from: "a", appUrl: "javascript:alert(1)", date: "today", outcomes: [], next: null, capacity: 0, overload: 0 })); });
test("provider rejection is surfaced and retry key is forwarded", async () => {
  const previous = process.env.RESEND_API_KEY; process.env.RESEND_API_KEY = "test-key";
  const fetchMock = mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => { assert.equal((init.headers as Record<string,string>)["Idempotency-Key"], "same-key"); return new Response(JSON.stringify({ message: "rejected" }), { status: 422 }); });
  try { await assert.rejects(sendDigest({ from: "a", to: ["b"], subject: "test", text: "test", html: "test" }, "same-key"), /rejected/); }
  finally { fetchMock.mock.restore(); if (previous === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous; }
});
