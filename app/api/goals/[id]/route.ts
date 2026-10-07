import { z } from "zod";
import { authenticated } from "@/lib/api";
import { HttpError, json, jsonBody } from "@/lib/http";
import { userTransaction } from "@/lib/tasks";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return authenticated(request, async (user) => {
    const { id } = await context.params;
    const data = z.object({ title: z.string().trim().min(1).max(200).optional(), importance: z.number().int().min(1).max(5).optional(), archived: z.boolean().optional() }).strict().parse(await jsonBody(request));
    return json(await userTransaction(user.id, async (tx) => {
      if (!await tx.goal.findFirst({ where: { id, userId: user.id } })) throw new HttpError(404, "Goal not found.");
      return tx.goal.update({ where: { id }, data });
    }));
  });
}
