import { test } from "node:test";
import assert from "node:assert/strict";
const database = process.env.BOARDO_TEST_DATABASE_URL;
test("PostgreSQL ownership, mutation and focus regressions", { skip: !database }, async (suite) => {
  const url = new URL(database!);
  assert.ok(["localhost", "127.0.0.1", "postgres"].includes(url.hostname) && url.pathname.endsWith("_test"), "Use an isolated local *_test database.");
  process.env.DATABASE_URL = database;
  const { prisma } = await import("../lib/db");
  const { createTask, patchTask, actOnTask, listTasks } = await import("../lib/tasks");
  const owner = await prisma.user.create({ data: { email: `owner-${crypto.randomUUID()}@example.invalid` } });
  const other = await prisma.user.create({ data: { email: `other-${crypto.randomUUID()}@example.invalid` } });
  const project = await prisma.project.create({ data: { userId: owner.id, name: "Regression project" } });
  const otherProject = await prisma.project.create({ data: { userId: other.id, name: "Private project" } });
  try {
    await suite.test("column-only update preserves due date in the database", async () => {
      const task = await createTask(owner.id, { projectId: project.id, title: "Has deadline", dueDate: new Date("2026-10-10") });
      const changed = await patchTask(owner.id, task.id, { version: task.version, column: "InProgress", orderInColumn: 0 });
      assert.equal(changed.dueDate?.toISOString(), "2026-10-10T00:00:00.000Z");
      const cleared = await patchTask(owner.id, task.id, { version: changed.version, dueDate: null });
      assert.equal(cleared.dueDate, null);
    });
    await suite.test("another owner cannot read, update, move, start or attach private tasks", async () => {
      const privateTask = await createTask(other.id, { projectId: otherProject.id, title: "Private" });
      assert.equal((await listTasks(owner.id)).some((t) => t.id === privateTask.id), false);
      await assert.rejects(patchTask(owner.id, privateTask.id, { version: 0, title: "Changed" }), /not found/);
      await assert.rejects(actOnTask(owner.id, privateTask.id, { version: 0, action: "start" }), /not found/);
      await assert.rejects(createTask(owner.id, { projectId: otherProject.id, title: "Wrong project" }), /not found/);
      await assert.rejects(createTask(owner.id, { projectId: project.id, title: "Wrong dependency", dependsOnId: privateTask.id }), /not found/);
    });
    await suite.test("stale writes fail instead of overwriting changes", async () => {
      const task = await createTask(owner.id, { projectId: project.id, title: "Version" });
      await patchTask(owner.id, task.id, { version: task.version, title: "New" });
      await assert.rejects(patchTask(owner.id, task.id, { version: task.version, title: "Stale" }), /changed/);
    });
    await suite.test("same-column move persists canonical order and shifts siblings", async () => {
      const board = await prisma.project.create({ data: { userId: owner.id, name: "Ordering" } });
      const a = await createTask(owner.id, { projectId: board.id, title: "A" });
      const b = await createTask(owner.id, { projectId: board.id, title: "B" });
      const c = await createTask(owner.id, { projectId: board.id, title: "C" });
      await patchTask(owner.id, c.id, { version: c.version, column: "Todo", orderInColumn: 0 });
      const rows = await listTasks(owner.id, board.id);
      assert.deepEqual(rows.map((t) => t.id), [c.id, a.id, b.id]);
      assert.deepEqual(rows.map((t) => t.orderInColumn), [0, 1, 2]);
    });
    await suite.test("concurrent creates do not duplicate positions", async () => {
      const board = await prisma.project.create({ data: { userId: owner.id, name: "Concurrent" } });
      await Promise.all(Array.from({ length: 4 }, (_, n) => createTask(owner.id, { projectId: board.id, title: `Task ${n}` })));
      assert.deepEqual((await listTasks(owner.id, board.id)).map((t) => t.orderInColumn), [0, 1, 2, 3]);
    });
    await suite.test("archived work is excluded and cannot receive new tasks", async () => {
      const board = await prisma.project.create({ data: { userId: owner.id, name: "Archive" } });
      const task = await createTask(owner.id, { projectId: board.id, title: "Hidden" });
      await prisma.project.update({ where: { id: board.id }, data: { archived: true } });
      assert.equal((await listTasks(owner.id)).some((t) => t.id === task.id), false);
      await assert.rejects(createTask(owner.id, { projectId: board.id, title: "No" }), /not found/);
    });
    await suite.test("starting another task closes the first session; completion stops focus", async () => {
      const a = await createTask(owner.id, { projectId: project.id, title: "Focus A" });
      const b = await createTask(owner.id, { projectId: project.id, title: "Focus B" });
      await actOnTask(owner.id, a.id, { version: a.version, action: "start" });
      const refreshed = await prisma.task.findUniqueOrThrow({ where: { id: b.id } });
      const started = await actOnTask(owner.id, b.id, { version: refreshed.version, action: "start" });
      const active = await prisma.focusSession.findMany({ where: { userId: owner.id, endedAt: null } });
      assert.equal(active.length, 1); assert.equal(active[0].taskId, b.id);
      const done = await actOnTask(owner.id, b.id, { version: started.version, action: "done" });
      assert.equal(done.column, "Done"); assert.ok(done.completedAt);
      assert.equal(await prisma.focusSession.count({ where: { userId: owner.id, endedAt: null } }), 0);
    });
    await suite.test("dependencies reject cycles and smaller steps preserve prerequisites", async () => {
      const a = await createTask(owner.id, { projectId: project.id, title: "Prerequisite" });
      const b = await createTask(owner.id, { projectId: project.id, title: "Dependent", dependsOnId: a.id });
      await assert.rejects(patchTask(owner.id, a.id, { version: a.version, dependsOnId: b.id }), /loop/);
      await assert.rejects(actOnTask(owner.id, b.id, { version: b.version, action: "start" }), /Unblock/);
      const parent = await actOnTask(owner.id, b.id, { version: b.version, action: "smaller", reason: "Small next step", minutes: 15 });
      const child = await prisma.task.findUniqueOrThrow({ where: { id: parent.dependsOnId! } });
      assert.equal(child.dependsOnId, a.id);
    });
  } finally {
    await prisma.project.deleteMany({ where: { userId: { in: [owner.id, other.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
    await prisma.$disconnect();
  }
});
