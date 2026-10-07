import { authenticated } from "@/lib/api";
import { json } from "@/lib/http";
import { todayData } from "@/lib/today";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return authenticated(request, async (user) => json(await todayData(user))); }
