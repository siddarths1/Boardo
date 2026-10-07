import { logout, SESSION_COOKIE } from "@/lib/auth";
import { apiError, json, sameOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try { sameOrigin(request); await logout(); const response = json({ ok: true }); response.cookies.delete(SESSION_COOKIE); return response; }
  catch (error) { return apiError(error); }
}
