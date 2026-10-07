import { test } from "node:test";
import assert from "node:assert/strict";
import { localDate, localDayRange, planDay, PlanningTask, Intent } from "../lib/planner";
const now = new Date("2026-10-06T08:00:00Z");
const intent: Intent = { availableMinutes: 120, bufferPercent: 20, energy: "Medium", context: "Desk", outcomeTaskIds: [], pinnedTaskIds: [] };
function task(id: string, changes: Partial<PlanningTask> = {}): PlanningTask { return { id, title: id, priority: "Medium", dueDate: null, column: "Todo", estimatedMinutes: 30, energy: "Medium", context: "Any", blockedReason: null, deferredUntil: null, createdAt: now, project: { archived: false }, ...changes }; }
const plan = (tasks: PlanningTask[], changes: Partial<Intent> = {}, options = {}) => planDay(tasks, { ...intent, ...changes }, { now, timezone: "Asia/Calcutta", spentMinutes: 0, ...options });
test("overdue medium outranks a future high task", () => { assert.equal(plan([task("future", { priority: "High", dueDate: "2026-12-01" }), task("overdue", { dueDate: "2026-10-05" })]).next?.task.id, "overdue"); });
test("chosen outcome receives a factual explanation", () => { const p = plan([task("a"), task("b")], { outcomeTaskIds: ["b"] }); assert.equal(p.next?.task.id, "b"); assert.match(p.next!.reasons.join(" "), /chosen outcomes/); });
test("completed, archived, blocked, deferred and dependent work is excluded", () => {
  const p = plan([task("done", { column: "Done" }), task("archive", { project: { archived: true } }), task("blocked", { blockedReason: "Waiting" }), task("later", { deferredUntil: "2026-10-07" }), task("dependency", { dependsOn: { column: "Todo" } }), task("ready")]);
  assert.deepEqual(p.blocks.map((b) => b.task.id), ["ready"]);
});
test("completed prerequisite unlocks the next task", () => { assert.equal(plan([task("ready", { dependsOn: { column: "Done" } })]).next?.task.id, "ready"); });
test("energy and context gate recommendations", () => { assert.equal(plan([task("hard", { energy: "High" }), task("outside", { context: "Outside" }), task("easy", { energy: "Low" })]).next?.task.id, "easy"); });
test("buffer and spent time reduce available capacity", () => { const p = plan([task("a"), task("b"), task("c")], {}, { spentMinutes: 30 }); assert.equal(p.capacity, 66); assert.equal(p.plannedMinutes, 60); });
test("oversized tasks do not become impossible recommendations", () => { const p = plan([task("big", { estimatedMinutes: 180 })]); assert.equal(p.next, null); assert.match(p.message!, /smaller step/); });
test("zero capacity suggests stopping instead of overbooking", () => { const p = plan([task("a")], { availableMinutes: 0 }); assert.equal(p.next, null); assert.equal(p.blocks.length, 0); assert.match(p.message!, /break/); });
test("active task remains stable when an urgent task arrives", () => { const p = plan([task("active"), task("urgent", { dueDate: "2026-01-01" })], {}, { activeTaskId: "active" }); assert.equal(p.next?.task.id, "active"); });
test("manual pins are retained and overload is exposed", () => { const p = plan([task("pin", { estimatedMinutes: 120 })], { pinnedTaskIds: ["pin"] }); assert.equal(p.blocks[0].task.id, "pin"); assert.equal(p.overloadMinutes, 24); });
test("blocked pins are never scheduled", () => { const p = plan([task("pin", { blockedReason: "Waiting" })], { pinnedTaskIds: ["pin"] }); assert.deepEqual(p.missingPins, ["pin"]); assert.equal(p.blocks.length, 0); });
test("important undated work can lead the plan", () => { assert.equal(plan([task("ordinary"), task("goal", { goal: { title: "Health", importance: 5, archived: false } })]).next?.task.id, "goal"); });
test("date-only due dates remain on their recorded day", () => { const p = plan([task("today", { dueDate: "2026-10-06T00:00:00Z" })]); assert.ok(p.next?.reasons.includes("Due today")); });
test("local day rolls over before UTC midnight in India", () => { assert.equal(localDate(new Date("2026-10-06T20:00:00Z"), "Asia/Calcutta"), "2026-10-07"); });
test("day bounds handle daylight-saving changes", () => { const bounds = localDayRange(new Date("2026-03-08T12:00:00Z"), "America/New_York"); assert.equal((bounds.end - bounds.start) / 3600000, 23); });
test("tie-breaking is deterministic and source array is unchanged", () => { const rows = [task("b"), task("a")]; assert.equal(plan(rows).next?.task.id, "a"); assert.equal(rows[0].id, "b"); });
