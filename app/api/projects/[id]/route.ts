import { z } from "zod";
import { authenticated } from "@/lib/api";
import { HttpError, json, jsonBody } from "@/lib/http";
import { userTransaction, stopFocus } from "@/lib/tasks";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return authenticated(request, async (user) => {
    const { id } = await context.params;
    const { version, ...data } = z.object({ version: z.number().int().nonnegative(), name: z.string().trim().min(1).max(150).optional(),
      archived: z.boolean().optional(), order: z.number().int().nonnegative().max(10000).optional() }).strict().parse(await jsonBody(request));
    return json(await userTransaction(user.id, async (tx) => {
      const project = await tx.project.findFirst({ where: { id, userId: user.id } });
      if (!project) throw new HttpError(404, "Project not found.");
      if (project.version !== version) throw new HttpError(409, "Project changed. Refresh and try again.");
      if (data.archived) {
        const active = await tx.focusSession.findFirst({ where: { userId: user.id, endedAt: null, task: { projectId: id } } });
        if (active) await stopFocus(tx, user.id, active.taskId);
      }
      await tx.project.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
      if (data.order !== undefined) {
        const projects = await tx.project.findMany({ where: { userId: user.id }, orderBy: [{ order: "asc" }, { id: "asc" }] });
        const ordered = projects.filter((p) => p.id !== id);
        ordered.splice(Math.min(data.order, ordered.length), 0, projects.find((p) => p.id === id)!);
        for (const [order, item] of ordered.entries()) if (item.order !== order) await tx.project.update({ where: { id: item.id }, data: { order, version: { increment: 1 } } });
      }
      return tx.project.findUniqueOrThrow({ where: { id } });
    }));
  });
}
