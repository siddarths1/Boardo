import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateSession, capacityMetrics, dayBounds, earliestDate, focusEnd } from "../lib/time-metrics";
test("session limits prevent unattended overnight counting",()=>{
 const session={startedAt:"2026-10-08T10:00:00Z",endedAt:null,limitAt:"2026-10-08T10:25:00Z"};
 assert.equal(focusEnd(session,new Date("2026-10-09T10:00:00Z")),Date.parse(session.limitAt));
});
test("pause is authoritative and sub-minute segments are not rounded individually",()=>{
 const days=[{date:"2026-10-08",...dayBounds("2026-10-08","Asia/Calcutta")}];
 const s={startedAt:"2026-10-08T10:00:00Z",endedAt:"2026-10-08T10:00:35Z"};
 assert.equal(allocateSession(s,days)[0].seconds*2,70);
});
test("midnight splits time exactly without assigning the entire session to its start day",()=>{
 const days=["2026-10-08","2026-10-09"].map(date=>({date,...dayBounds(date,"Asia/Calcutta")}));
 const result=allocateSession({startedAt:"2026-10-08T18:20:00Z",endedAt:"2026-10-08T18:40:00Z"},days);
 assert.deepEqual(result.map(r=>r.seconds),[600,600]);
});
test("DST and UTC+14 days have correct boundaries",()=>{
 const dst=dayBounds("2026-03-08","America/New_York");assert.equal(dst.end-dst.start,23*3600000);
 const east=dayBounds("2026-10-08","Pacific/Kiritimati");assert.equal(new Date(east.start).toISOString(),"2026-10-07T10:00:00.000Z");
});
test("missing plans do not manufacture unused time; overtime is separate",()=>{
 assert.equal(capacityMetrics(3600,null).unusedMinutes,null);
 assert.deepEqual(capacityMetrics(3600,120,20),{bufferMinutes:24,capacityMinutes:96,unusedMinutes:36,overtimeMinutes:0});
 assert.equal(capacityMetrics(7200,120,20).overtimeMinutes,24);
});
test("three-year boundary handles leap days",()=>{assert.equal(earliestDate("2024-02-29"),"2021-02-28");});
