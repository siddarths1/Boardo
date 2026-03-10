import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { archived: false },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, order } = body as { name?: string; order?: number };
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const maxOrder = await prisma.project.aggregate({ _max: { order: true } }).then((r) => r._max.order ?? -1);
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        order: typeof order === "number" ? order : maxOrder + 1,
      },
    });
    return NextResponse.json(project);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
