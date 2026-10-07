import { z } from "zod";
import { authenticated } from "@/lib/api";
import { json, jsonBody } from "@/lib/http";
import { taskPatch } from "@/lib/validation";
import { patchTask, deleteTask } from "@/lib/tasks";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return authenticated(request, async (user) => json(await patchTask(user.id, (await context.params).id, taskPatch.parse(await jsonBody(request))))); }
export async function DELETE(request: Request, context: Context) {
  return authenticated(request, async (user) => {
    const { version } = z.object({ version: z.number().int().nonnegative() }).parse(await jsonBody(request));
    await deleteTask(user.id, (await context.params).id, version); return json({ ok: true });
  });
}
