import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sortTasksByPriorityAndDue } from "@/lib/priorities";
import { sendDailyDigest } from "@/lib/email";

export const maxDuration = 30;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = process.env.DIGEST_EMAIL;
  if (!to) {
    return NextResponse.json({ error: "DIGEST_EMAIL not set" }, { status: 500 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { column: { in: ["Todo", "InProgress"] } },
      include: { project: { select: { name: true } } },
    });

    const sorted = sortTasksByPriorityAndDue(
      tasks.map((t) => ({ ...t, dueDate: t.dueDate }))
    );

    await sendDailyDigest(to, sorted);
    return NextResponse.json({ ok: true, count: sorted.length });
  } catch (e) {
    console.error("Daily digest error:", e);
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }
}
