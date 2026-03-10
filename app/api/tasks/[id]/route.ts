import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await _request.json();
    const { title, projectId, priority, dueDate, column, orderInColumn } = body as {
      title?: string;
      projectId?: string;
      priority?: string;
      dueDate?: string | null;
      column?: string;
      orderInColumn?: number;
    };
    const data: {
      title?: string;
      projectId?: string;
      priority?: string;
      dueDate?: Date | null;
      column?: string;
      orderInColumn?: number;
    } = {};
    if (typeof title === "string" && title.trim() !== "") data.title = title.trim();
    if (typeof projectId === "string") data.projectId = projectId;
    if (priority && ["High", "Medium", "Low"].includes(priority)) data.priority = priority;
    if (dueDate === null || dueDate === undefined) data.dueDate = null;
    else if (typeof dueDate === "string") data.dueDate = new Date(dueDate);
    if (column && ["Todo", "InProgress", "Done"].includes(column)) data.column = column;
    if (typeof orderInColumn === "number") data.orderInColumn = orderInColumn;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const task = await prisma.task.update({
      where: { id },
      data,
      include: { project: { select: { name: true } } },
    });
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
