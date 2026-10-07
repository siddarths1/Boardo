import { authenticated } from "@/lib/api";
import { json, jsonBody } from "@/lib/http";
import { taskAction } from "@/lib/validation";
import { actOnTask } from "@/lib/tasks";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return authenticated(request, async (user) => json(await actOnTask(user.id, (await context.params).id, taskAction.parse(await jsonBody(request)))));
}
