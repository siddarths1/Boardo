import { test } from "node:test";
import assert from "node:assert/strict";
import { taskPatch, taskCreate, intentInput } from "../lib/validation";
test("column-only updates preserve an omitted due date", () => { const value = taskPatch.parse({ version: 0, column: "InProgress" }); assert.equal(Object.hasOwn(value, "dueDate"), false); });
test("only explicit null clears a date", () => { assert.equal(taskPatch.parse({ version: 0, dueDate: null }).dueDate, null); });
test("date-only input is normalized to UTC and impossible dates rejected", () => { assert.equal(taskPatch.parse({ version: 0, dueDate: "2026-10-06" }).dueDate?.toISOString(), "2026-10-06T00:00:00.000Z"); assert.throws(() => taskPatch.parse({ version: 0, dueDate: "2026-02-30" })); });
test("stale-version protection cannot be omitted", () => { assert.throws(() => taskPatch.parse({ title: "test" })); });
test("unknown fields, invalid enum, fractional ranks and oversized titles rejected", () => {
  for (const value of [{ userId: "other" }, { priority: "Critical" }, { orderInColumn: .5 }, { title: "x".repeat(301) }]) assert.throws(() => taskPatch.parse({ version: 0, ...value }));
});
test("task creation requires real title and project", () => { assert.throws(() => taskCreate.parse({ title: " ", projectId: "a" })); assert.throws(() => taskCreate.parse({ title: "test", projectId: "" })); });
test("daily intent limits outcomes and capacity", () => { const base = { version: 0, outcomes: [], outcomeTaskIds: [], pinnedTaskIds: [], availableMinutes: 240, bufferPercent: 20, energy: "Medium", context: "Desk", review: "" }; assert.equal(intentInput.parse(base).availableMinutes, 240); assert.throws(() => intentInput.parse({ ...base, outcomes: ["a", "b", "c", "d"] })); assert.throws(() => intentInput.parse({ ...base, availableMinutes: -1 })); });
