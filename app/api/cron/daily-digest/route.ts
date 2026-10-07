import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, apiError, json } from "@/lib/http";
import { todayData } from "@/lib/today";
import { userTransaction } from "@/lib/tasks";
import { digestPayload, DigestPayload, sendDigest } from "@/lib/email";
export const maxDuration = 30;
export const dynamic = "force-dynamic";
async function handler(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new HttpError(503, "Scheduled delivery is not configured.");
    const hash = (value: string) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(hash(request.headers.get("authorization") || ""), hash(`Bearer ${secret}`))) throw new HttpError(401, "Unauthorized.");
    if (!process.env.DIGEST_EMAIL || !process.env.RESEND_FROM || !process.env.RESEND_API_KEY || !process.env.APP_URL || !process.env.BOARDO_OWNER_EMAIL) throw new HttpError(503, "Email settings are incomplete.");
    const user = await prisma.user.findUnique({ where: { email: process.env.BOARDO_OWNER_EMAIL.trim().toLowerCase() } });
    if (!user) throw new HttpError(503, "Owner setup is incomplete.");
    const today = await todayData(user);
    const payload = digestPayload({ to: process.env.DIGEST_EMAIL, from: process.env.RESEND_FROM, appUrl: process.env.APP_URL, date: today.date,
      outcomes: today.intent.outcomes, next: today.plan.next ? { title: today.plan.next.task.title, minutes: today.plan.next.minutes, reasons: today.plan.next.reasons } : null,
      capacity: today.plan.capacity, overload: today.plan.overloadMinutes });
    const run = await userTransaction(user.id, async (tx) => {
      const existing = await tx.digestRun.findUnique({ where: { userId_date: { userId: user.id, date: today.date } } });
      if (existing?.status === "sent") return null;
      if (existing?.lockedAt && Date.now() - existing.lockedAt.getTime() < 10 * 60000) return null;
      // Resend idempotency expires after 24h. Never blindly retry an uncertain old send.
      if (existing && Date.now() - existing.createdAt.getTime() > 23 * 3600000) throw new HttpError(409, "An earlier delivery needs reconciliation.");
      return tx.digestRun.upsert({ where: { userId_date: { userId: user.id, date: today.date } },
        create: { userId: user.id, date: today.date, payload: payload as unknown as Prisma.InputJsonValue, lockedAt: new Date() },
        update: { status: "pending", lockedAt: new Date() } });
    });
    if (!run) return json({ ok: true, skipped: true });
    try {
      const providerId = await sendDigest(run.payload as unknown as DigestPayload, `boardo-digest-${run.id}`);
      await prisma.digestRun.update({ where: { id: run.id }, data: { status: "sent", providerId, lockedAt: null } });
      return json({ ok: true });
    } catch {
      await prisma.digestRun.update({ where: { id: run.id }, data: { status: "failed", lockedAt: null } });
      throw new HttpError(502, "Delivery failed. A retry will use the same delivery key.");
    }
  } catch (error) { return apiError(error); }
}
export const GET = handler;
export const POST = handler;
