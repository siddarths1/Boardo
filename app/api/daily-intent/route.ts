import { authenticated } from "@/lib/api";
import { HttpError, json, jsonBody } from "@/lib/http";
import { intentInput } from "@/lib/validation";
import { userTransaction } from "@/lib/tasks";
import { localDate } from "@/lib/planner";
export async function PUT(request: Request) {
  return authenticated(request, async (user) => {
    const { version, ...data } = intentInput.parse(await jsonBody(request));
    const date = localDate(new Date(), user.timezone);
    const intent = await userTransaction(user.id, async (tx) => {
      const current = await tx.dailyIntent.findUnique({ where: { userId_date: { userId: user.id, date } } });
      if ((current?.version || 0) !== version) throw new HttpError(409, "Today's plan changed. Refresh and try again.");
      const ids = [...new Set([...data.outcomeTaskIds, ...data.pinnedTaskIds])];
      const count = await tx.task.count({ where: { id: { in: ids }, project: { userId: user.id, archived: false } } });
      if (count !== ids.length) throw new HttpError(400, "Choose tasks from your active projects.");
      return tx.dailyIntent.upsert({ where: { userId_date: { userId: user.id, date } },
        create: { userId: user.id, date, ...data, version: 1 }, update: { ...data, version: { increment: 1 } } });
    });
    return json(intent);
  });
}
