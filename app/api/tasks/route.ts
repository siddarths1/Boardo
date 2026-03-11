import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sortTasksByPriorityAndDue } from "@/lib/priorities";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const activeOnly = searchParams.get("activeOnly") !== "false"; // default: only Todo + InProgress for "today's priorities"

    const where: { projectId?: string; column?: { in: string[] } } = {};
    if (projectId) where.projectId = projectId;
    if (activeOnly) where.column = { in: ["Todo", "InProgress"] };

    const tasks = await prisma.task.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: [{ column: "asc" }, { orderInColumn: "asc" }],
    });

    const sorted = sortTasksByPriorityAndDue(
      tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate,
      }))
    );
    return NextResponse.json(sorted);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[GET /api/tasks]", e);
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, projectId, priority, dueDate } = body as {
      title?: string;
      projectId?: string;
      priority?: string;
      dueDate?: string | null;
    };
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    const priorityVal =
      priority && ["High", "Medium", "Low"].includes(priority) ? priority : "Medium";
    const due = dueDate ? new Date(dueDate) : null;
    const maxOrder = await prisma.task
      .aggregate({
        where: { projectId, column: "Todo" },
        _max: { orderInColumn: true },
      })
      .then((r) => (r._max.orderInColumn ?? -1) + 1);

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        projectId,
        priority: priorityVal,
        dueDate: due,
        column: "Todo",
        orderInColumn: maxOrder,
      },
      include: { project: { select: { name: true } } },
    });
    return NextResponse.json(task);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[POST /api/tasks]", e);
    return NextResponse.json(
      { error: "Failed to create task", details: message },
      { status: 500 }
    );
  }
}
