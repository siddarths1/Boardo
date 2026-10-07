import { authenticated } from "@/lib/api";
import { json, jsonBody } from "@/lib/http";
import { goalInput } from "@/lib/validation";
import { prisma } from "@/lib/db";
export async function GET(request: Request) { return authenticated(request, async (user) => json(await prisma.goal.findMany({ where: { userId: user.id, archived: false } }))); }
export async function POST(request: Request) { return authenticated(request, async (user) => json(await prisma.goal.create({ data: { ...goalInput.parse(await jsonBody(request)), userId: user.id } }), 201)); }
