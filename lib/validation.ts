import { z } from "zod";
export const energy = z.enum(["Low", "Medium", "High"]);
export const context = z.enum(["Any", "Desk", "Phone", "Outside"]);
export const column = z.enum(["Todo", "InProgress", "Done"]);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Use a valid date.")
  .transform((s) => new Date(`${s}T00:00:00.000Z`));
export const taskFields = z.object({
  title: z.string().trim().min(1, "Add a task title.").max(300), projectId: z.string().min(1),
  goalId: z.string().min(1).nullable().optional(), notes: z.string().max(4000).optional(),
  dependsOnId: z.string().min(1).nullable().optional(),
  priority: energy.optional(), dueDate: dateOnly.nullable().optional(),
  estimatedMinutes: z.number().int().min(5).max(720).optional(), energy: energy.optional(), context: context.optional(),
});
export const taskCreate = taskFields.strict();
export const taskPatch = taskFields.partial().extend({
  version: z.number().int().nonnegative(), column: column.optional(), orderInColumn: z.number().int().nonnegative().max(10000).optional(),
}).strict().refine((v) => Object.keys(v).length > 1, "No changes to save.");
export const taskAction = z.object({
  action: z.enum(["start", "pause", "done", "defer", "block", "unblock", "reopen", "smaller"]),
  version: z.number().int().nonnegative(), reason: z.string().trim().max(500).optional(), minutes: z.number().int().min(5).max(10080).optional(),
}).strict();
export const intentInput = z.object({
  version: z.number().int().nonnegative(), outcomes: z.array(z.string().trim().min(1).max(200)).max(3),
  outcomeTaskIds: z.array(z.string()).max(3), pinnedTaskIds: z.array(z.string()).max(10),
  availableMinutes: z.number().int().min(0).max(720), bufferPercent: z.number().int().min(0).max(50),
  energy, context, review: z.string().max(4000),
}).strict();
export const goalInput = z.object({ title: z.string().trim().min(1).max(200), area: z.enum(["Work", "Personal", "Health", "Learning"]), importance: z.number().int().min(1).max(5) }).strict();
