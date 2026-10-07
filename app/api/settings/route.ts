import { z } from "zod";
import { authenticated } from "@/lib/api";
import { json, jsonBody } from "@/lib/http";
import { prisma } from "@/lib/db";
export async function PATCH(request: Request) {
  return authenticated(request, async (user) => {
    const data = z.object({ timezone: z.string().max(100).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Choose a valid timezone.") }).strict().parse(await jsonBody(request));
    return json(await prisma.user.update({ where: { id: user.id }, data, select: { timezone: true } }));
  });
}
