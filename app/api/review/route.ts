import { z } from "zod";
import { authenticated } from "@/lib/api";
import { HttpError, json, jsonBody } from "@/lib/http";
import { localDate } from "@/lib/planner";
import { userTransaction } from "@/lib/tasks";
export async function PUT(request: Request) {
  return authenticated(request, async (user) => {
    const input = z.object({ version: z.number().int().nonnegative(), review: z.string().max(4000), carryTaskIds: z.array(z.string()).max(3) }).strict().parse(await jsonBody(request));
    const date = localDate(new Date(), user.timezone);
    const tomorrow = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
    await userTransaction(user.id, async (tx) => {
      const current = await tx.dailyIntent.findUnique({ where: { userId_date: { userId: user.id, date } } });
      if ((current?.version || 0) !== input.version) throw new HttpError(409, "Your day changed. Refresh before saving the review.");
      const ids = [...new Set(input.carryTaskIds)];
      if (await tx.task.count({ where: { id: { in: ids }, column: { not: "Done" }, project: { userId: user.id, archived: false } } }) !== ids.length) throw new HttpError(400, "Choose unfinished tasks from active projects.");
      await tx.dailyIntent.upsert({ where: { userId_date: { userId: user.id, date } }, create: { userId: user.id, date, review: input.review, version: 1 }, update: { review: input.review, version: { increment: 1 } } });
      if (ids.length) {
        const future = await tx.dailyIntent.findUnique({ where: { userId_date: { userId: user.id, date: tomorrow } } });
        const merged = [...new Set([...(future?.outcomeTaskIds || []), ...ids])];
        if (merged.length > 3) throw new HttpError(409, "Tomorrow already has chosen tasks. Carry fewer tasks forward.");
        await tx.dailyIntent.upsert({ where: { userId_date: { userId: user.id, date: tomorrow } }, create: { userId: user.id, date: tomorrow, outcomeTaskIds: merged, version: 1 }, update: { outcomeTaskIds: merged, version: { increment: 1 } } });
      }
    });
    return json({ ok: true });
  });
}
