import { authenticated } from "@/lib/api";
import { json } from "@/lib/http";
import { reviewAnalytics } from "@/lib/analytics";
import { localDate } from "@/lib/planner";
export async function GET(request: Request) { return authenticated(request, async user => {
  const params = new URL(request.url).searchParams, today = localDate(new Date(), user.timezone);
  return json(await reviewAnalytics(user, params.get("start") || today, params.get("end") || today));
}); }
