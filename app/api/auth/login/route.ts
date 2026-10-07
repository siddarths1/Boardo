import { z } from "zod";
import { login, SESSION_COOKIE } from "@/lib/auth";
import { apiError, json, jsonBody, sameOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { password } = z.object({ password: z.string().min(1).max(256) }).parse(await jsonBody(request));
    const { token, expiresAt } = await login(password);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: expiresAt });
    return response;
  } catch (error) { return apiError(error); }
}
