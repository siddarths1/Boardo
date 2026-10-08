import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function sameOrigin(request: Request) {
  const expected = process.env.APP_URL || new URL(request.url).origin;
  if (request.headers.get("origin") !== new URL(expected).origin) throw new HttpError(403, "Refresh this page before trying again.");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Expected JSON.");
  if (Number(request.headers.get("content-length")) > 32000) throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Expected a request body.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > 32000) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new HttpError(400, "Invalid JSON."); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
  const reference = crypto.randomUUID();
  const details = error && typeof error === "object" ? error as { code?: string; errorCode?: string } : {};
  const code = details.code || details.errorCode;
  console.error("Request failed", { reference, name: error instanceof Error ? error.name : "Unknown", code });
  if (code && ["P1001", "P1002", "P1017", "P2024", "P2037"].includes(code)) {
    return NextResponse.json({ error: "The database is temporarily busy. Please try again shortly.", reference }, { status: 503, headers: { "Retry-After": "1", "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "Something went wrong. Please retry.", reference }, { status: 500 });
}
export const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
