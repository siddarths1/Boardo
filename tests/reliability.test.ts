import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseUrl } from "../lib/database-url";
import { request } from "../lib/client";
import { apiError } from "../lib/http";

test("serverless connections are bounded without changing credentials or explicit settings", () => {
 const u=new URL(databaseUrl("postgres://user:pass@localhost:5432/db?sslmode=require")!);
 assert.equal(u.searchParams.get("connection_limit"),"1");assert.equal(u.searchParams.get("pool_timeout"),"15");
 assert.equal(u.password,"pass");assert.equal(u.searchParams.get("sslmode"),"require");
 assert.equal(new URL(databaseUrl("postgres://u:p@localhost/db?connection_limit=3")!).searchParams.get("connection_limit"),"3");
 assert.equal(databaseUrl(undefined),undefined);assert.equal(databaseUrl("prisma://example"),"prisma://example");
});
test("temporary database failures return retryable status without leaking database details",async()=>{
 const r=apiError(Object.assign(new Error("secret database URL"),{code:"P2037"}));
 assert.equal(r.status,503);assert.equal(r.headers.get("Retry-After"),"1");
 assert.ok(!(await r.text()).includes("secret"));
});
test("read retries recover, writes are never repeated, and aborted reads stop",async(t)=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 let calls=0;
 globalThis.fetch=async()=>++calls===1?Response.json({error:"busy"},{status:503}):Response.json({ok:true});
 assert.deepEqual(await request("/api/analytics"),{ok:true});assert.equal(calls,2);
 calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:"busy"},{status:503});};
 await assert.rejects(request("/api/focus","POST",{}),/busy/);assert.equal(calls,1);
 calls=0;const controller=new AbortController();
 globalThis.fetch=async()=>{calls++;controller.abort();return Response.json({error:"busy"},{status:503});};
 await assert.rejects(request("/api/analytics","GET",undefined,controller.signal));assert.equal(calls,1);
});
