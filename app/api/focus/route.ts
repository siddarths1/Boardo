import { z } from "zod";
import { authenticated } from "@/lib/api";
import { HttpError, json, jsonBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { userTransaction, stopFocus } from "@/lib/tasks";
import { focusEnd } from "@/lib/time-metrics";
export async function GET(request: Request) { return authenticated(request, async user => {
  const session = await prisma.focusSession.findFirst({ where: { userId: user.id }, orderBy: { startedAt: "desc" }, include: { task: { select: { column: true, project: { select: { archived: true } } } } } });
  return json({ session, canResume: Boolean(session?.task && session.task.column !== "Done" && !session.task.project.archived), serverNow: new Date().toISOString() });
}); }
const input = z.object({ id: z.string(), version: z.number().int().nonnegative(), action: z.enum(["pause","extend","correct"]), minutes: z.number().int().min(0).max(180).optional(), reason: z.string().trim().min(3).max(500).optional() }).strict();
export async function POST(request: Request) { return authenticated(request, async user => {
  const data = input.parse(await jsonBody(request));
  return json(await userTransaction(user.id, async tx => {
    const session = await tx.focusSession.findFirst({ where: { id: data.id, userId: user.id } });
    if (!session) throw new HttpError(404,"Session not found.");
    if (session.version !== data.version) throw new HttpError(409,"Session changed. Refresh and try again.");
    const now = new Date(), end = focusEnd(session,now);
    if (data.action === "pause") { if (!session.endedAt) await stopFocus(tx,user.id,session.taskId || undefined); }
    else if (data.action === "extend") {
      if (session.endedAt || end < now.getTime()) throw new HttpError(409,"This session ended. Start another focus session.");
      const limitAt = new Date(Math.min(session.startedAt.getTime()+180*60000,end+15*60000));
      // end is now for a running timer; extend the actual deadline, not elapsed time.
      limitAt.setTime(Math.min(session.startedAt.getTime()+180*60000,(session.limitAt?.getTime() || end)+15*60000));
      await tx.focusSession.update({where:{id:session.id},data:{limitAt,plannedMinutes:Math.round((limitAt.getTime()-session.startedAt.getTime())/60000),version:{increment:1}}});
    } else {
      if (!session.endedAt && end >= now.getTime()) throw new HttpError(409,"Pause the timer before correcting it.");
      if (data.minutes === undefined || !data.reason) throw new HttpError(400,"Enter corrected minutes and a reason.");
      if (data.minutes*60000 > end-session.startedAt.getTime()) throw new HttpError(400,"Corrections can only remove accidentally recorded time.");
      await tx.focusSession.update({where:{id:session.id},data:{endedAt:new Date(session.startedAt.getTime()+data.minutes*60000),minutes:data.minutes,correctionNote:data.reason,stopReason:"corrected",version:{increment:1}}});
    }
    await tx.activityEvent.create({data:{userId:user.id,taskId:session.taskId,taskTitle:session.taskTitle,projectId:session.projectId,projectName:session.projectName,goalId:session.goalId,goalTitle:session.goalTitle,action:"focus_"+data.action,detail:data.action==="correct" ? `Changed from ${Math.floor((end-session.startedAt.getTime())/60000)} to ${data.minutes} minutes: ${data.reason}` : ""}});
    return {ok:true};
  }));
}); }
