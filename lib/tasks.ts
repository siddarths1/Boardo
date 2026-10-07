import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { HttpError } from "./http";
import { taskCreate, taskPatch, taskAction } from "./validation";

export const taskInclude = { project: { select: { name: true, archived: true } }, goal: true,
  dependsOn: { select: { id: true, title: true, column: true } } } satisfies Prisma.TaskInclude;
export type FullTask = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
export async function userTransaction<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    // One row lock serializes board ordering, focus state and version checks per owner.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    return fn(tx);
  }, { timeout: 15000 });
}
export async function ownedTask(tx: Prisma.TransactionClient, userId: string, id: string, version?: number) {
  const task = await tx.task.findFirst({ where: { id, project: { userId, archived: false } }, include: taskInclude });
  if (!task) throw new HttpError(404, "Task not found.");
  if (version !== undefined && task.version !== version) throw new HttpError(409, "This task changed. Refresh and try again.");
  return task;
}
async function checkLinks(tx: Prisma.TransactionClient, userId: string, data: { projectId?: string; goalId?: string | null; dependsOnId?: string | null }, taskId?: string) {
  if (data.projectId && !await tx.project.findFirst({ where: { id: data.projectId, userId, archived: false } })) throw new HttpError(404, "Project not found.");
  if (data.goalId && !await tx.goal.findFirst({ where: { id: data.goalId, userId, archived: false } })) throw new HttpError(404, "Goal not found.");
  if (data.dependsOnId) {
    const seen = new Set(taskId ? [taskId] : []);
    let next: string | null = data.dependsOnId;
    while (next) {
      if (seen.has(next)) throw new HttpError(400, "Tasks cannot depend on themselves or form a loop.");
      seen.add(next);
      const prerequisite: { dependsOnId: string | null } | null = await tx.task.findFirst({ where: { id: next, project: { userId, archived: false } }, select: { dependsOnId: true } });
      if (!prerequisite) throw new HttpError(404, "Prerequisite task not found.");
      next = prerequisite.dependsOnId;
    }
  }
}
export function listTasks(userId: string, projectId?: string, activeOnly = false) {
  return prisma.task.findMany({ where: { project: { userId, archived: false }, ...(projectId ? { projectId } : {}), ...(activeOnly ? { column: { not: "Done" } } : {}) },
    include: taskInclude, orderBy: [{ column: "asc" }, { orderInColumn: "asc" }, { id: "asc" }] });
}
export async function createTask(userId: string, input: z.infer<typeof taskCreate>) {
  return userTransaction(userId, async (tx) => {
    await checkLinks(tx, userId, input);
    const count = await tx.task.count({ where: { projectId: input.projectId, column: "Todo" } });
    const task = await tx.task.create({ data: { ...input, orderInColumn: count }, include: taskInclude });
    await tx.activityEvent.create({ data: { userId, taskId: task.id, action: "created" } });
    return task;
  });
}
async function normalize(tx: Prisma.TransactionClient, projectId: string, column: string, movedId?: string, targetIndex = 0) {
  const rows = await tx.task.findMany({ where: { projectId, column }, orderBy: [{ orderInColumn: "asc" }, { id: "asc" }], select: { id: true, orderInColumn: true } });
  const ordered = rows.filter((t) => t.id !== movedId);
  const moved = rows.find((t) => t.id === movedId);
  if (moved) ordered.splice(Math.min(targetIndex, ordered.length), 0, moved);
  for (const [index, task] of ordered.entries()) {
    if (task.orderInColumn !== index) await tx.task.update({ where: { id: task.id }, data: { orderInColumn: index, version: { increment: 1 } } });
  }
}
export async function stopFocus(tx: Prisma.TransactionClient, userId: string, taskId?: string) {
  const now = new Date();
  const active = await tx.focusSession.findMany({ where: { userId, endedAt: null, ...(taskId ? { taskId } : {}) } });
  for (const session of active) await tx.focusSession.update({ where: { id: session.id }, data: { endedAt: now, minutes: Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 60000)) } });
}
export async function patchTask(userId: string, id: string, input: z.infer<typeof taskPatch>) {
  return userTransaction(userId, async (tx) => {
    const previous = await ownedTask(tx, userId, id, input.version);
    const { version: _version, ...data } = input;
    await checkLinks(tx, userId, data, id);
    if (data.column && data.column !== previous.column) await stopFocus(tx, userId, id);
    await tx.task.update({ where: { id }, data: { ...data, version: { increment: 1 },
      ...(data.column ? { completedAt: data.column === "Done" ? previous.completedAt || new Date() : null } : {}) } });
    if (data.column || data.orderInColumn !== undefined || data.projectId) {
      const destProject = data.projectId || previous.projectId;
      const destColumn = data.column || previous.column;
      if (destProject !== previous.projectId || destColumn !== previous.column) await normalize(tx, previous.projectId, previous.column);
      await normalize(tx, destProject, destColumn, id, data.orderInColumn ?? 0);
    }
    await tx.activityEvent.create({ data: { userId, taskId: id, action: data.column === "Done" ? "done" : "edited" } });
    return tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
  });
}
export async function actOnTask(userId: string, id: string, input: z.infer<typeof taskAction>) {
  return userTransaction(userId, async (tx) => {
    const task = await ownedTask(tx, userId, id, input.version);
    if (task.column === "Done" && input.action !== "reopen") throw new HttpError(409, "Reopen this task before taking another action.");
    const data: Prisma.TaskUpdateInput = { version: { increment: 1 } };
    if (input.action === "start") {
      if (task.column === "Done" || task.blockedReason || (task.dependsOn && task.dependsOn.column !== "Done")) throw new HttpError(409, "Unblock or reopen this task before starting.");
      await stopFocus(tx, userId);
      data.column = "InProgress"; data.deferredUntil = null;
      await tx.focusSession.create({ data: { userId, taskId: id } });
    } else if (input.action === "done") {
      data.column = "Done"; data.completedAt = new Date(); data.deferredUntil = null; data.blockedReason = null;
      await stopFocus(tx, userId, id);
    } else if (input.action === "reopen") { data.column = "Todo"; data.completedAt = null;
    } else if (input.action === "defer") {
      data.deferredUntil = new Date(Date.now() + (input.minutes ?? 60) * 60000);
      await stopFocus(tx, userId, id);
    } else if (input.action === "block") {
      if (!input.reason) throw new HttpError(400, "Add what is blocking this task.");
      data.blockedReason = input.reason; await stopFocus(tx, userId, id);
    } else if (input.action === "unblock") { data.blockedReason = null; data.deferredUntil = null;
    } else if (input.action === "pause") { await stopFocus(tx, userId, id);
    } else if (input.action === "smaller") {
      if (!input.reason) throw new HttpError(400, "Describe the smaller next step.");
      const count = await tx.task.count({ where: { projectId: task.projectId, column: "Todo" } });
      const step = await tx.task.create({ data: { projectId: task.projectId, goalId: task.goalId, title: input.reason, priority: task.priority,
        estimatedMinutes: Math.min(input.minutes ?? 15, 120), energy: task.energy, context: task.context, orderInColumn: count, dependsOnId: task.dependsOnId } });
      // The parent can be resumed when this prerequisite is finished.
      data.dependsOn = { connect: { id: step.id } }; await stopFocus(tx, userId, id);
    }
    const changed = await tx.task.update({ where: { id }, data, include: taskInclude });
    if (changed.column !== task.column) { await normalize(tx, task.projectId, task.column); await normalize(tx, task.projectId, changed.column, id, 0); }
    await tx.activityEvent.create({ data: { userId, taskId: id, action: input.action, detail: input.reason || "" } });
    return tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
  });
}
export async function deleteTask(userId: string, id: string, version: number) {
  return userTransaction(userId, async (tx) => {
    const task = await ownedTask(tx, userId, id, version);
    await tx.task.delete({ where: { id } });
    await normalize(tx, task.projectId, task.column);
    await tx.activityEvent.create({ data: { userId, taskId: id, action: "deleted" } });
  });
}
