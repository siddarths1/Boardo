import { authenticated } from "@/lib/api";
import { json, jsonBody } from "@/lib/http";
import { taskCreate } from "@/lib/validation";
import { createTask, listTasks } from "@/lib/tasks";
export async function GET(request: Request) {
  return authenticated(request, async (user) => {
    const query = new URL(request.url).searchParams;
    return json(await listTasks(user.id, query.get("projectId") || undefined, query.get("activeOnly") !== "false"));
  });
}
export async function POST(request: Request) { return authenticated(request, async (user) => json(await createTask(user.id, taskCreate.parse(await jsonBody(request))), 201)); }
