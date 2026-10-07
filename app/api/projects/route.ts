import { z } from "zod";
import { authenticated } from "@/lib/api";
import { json, jsonBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { userTransaction } from "@/lib/tasks";
export async function GET(request: Request) {
  return authenticated(request, async (user) => json(await prisma.project.findMany({ where: { userId: user.id, ...(new URL(request.url).searchParams.get("archived") === "true" ? {} : { archived: false }) }, orderBy: [{ order: "asc" }, { id: "asc" }] })));
}
export async function POST(request: Request) {
  return authenticated(request, async (user) => {
    const data = z.object({ name: z.string().trim().min(1, "Add a project name.").max(150) }).strict().parse(await jsonBody(request));
    return json(await userTransaction(user.id, async (tx) => {
      const count = await tx.project.count({ where: { userId: user.id } });
      return tx.project.create({ data: { ...data, userId: user.id, order: count } });
    }), 201);
  });
}
