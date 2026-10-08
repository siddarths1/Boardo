import { test } from "node:test";
import assert from "node:assert/strict";
const database=process.env.BOARDO_TEST_DATABASE_URL;
test("analytics retains attribution and history across editing, archiving and deletion",{skip:!database},async()=>{
 const url=new URL(database!);assert.ok(["localhost","127.0.0.1","postgres"].includes(url.hostname)&&url.pathname.endsWith("_test"));
 process.env.DATABASE_URL=database;
 const {prisma}=await import("../lib/db");const {createTask,actOnTask,deleteTask,patchTask}=await import("../lib/tasks");
 const {reviewAnalytics}=await import("../lib/analytics");const {localDate}=await import("../lib/planner");
 const owner=await prisma.user.create({data:{email:crypto.randomUUID()+"@example.invalid",timezone:"Asia/Calcutta"}});
 const other=await prisma.user.create({data:{email:crypto.randomUUID()+"@example.invalid"}});
 try{
 const p=await prisma.project.create({data:{userId:owner.id,name:"Original project"}});
 const g=await prisma.goal.create({data:{userId:owner.id,title:"Original goal"}});
 const task=await createTask(owner.id,{projectId:p.id,title:"Original task",goalId:g.id});
 let changed=await actOnTask(owner.id,task.id,{version:task.version,action:"start",minutes:25});
 const session=await prisma.focusSession.findFirstOrThrow({where:{userId:owner.id}});
 assert.equal(session.projectName,"Original project");assert.equal(session.goalTitle,"Original goal");
 assert.equal(session.limitAt!.getTime()-session.startedAt.getTime(),25*60000);
 const now=new Date();await prisma.focusSession.update({where:{id:session.id},data:{startedAt:new Date(now.getTime()-600000),endedAt:new Date(now.getTime()-300000)}});
 changed=await patchTask(owner.id,task.id,{version:changed.version,title:"Renamed",goalId:null});
 await deleteTask(owner.id,task.id,changed.version);
 const retained=await prisma.focusSession.findUniqueOrThrow({where:{id:session.id}});assert.equal(retained.taskId,null);assert.equal(retained.taskTitle,"Original task");
 const today=localDate(now,owner.timezone);const report=await reviewAnalytics(owner,today,today);
 assert.ok(report.totals.focusSeconds>0);assert.equal(report.goals[0].name,"Original goal");
 assert.equal(report.projects[0].name,"Original project");assert.equal(report.totals.missingPlanDays,1);
 const privateReport=await reviewAnalytics(other,today,today);assert.equal(privateReport.totals.focusSeconds,0);
 await assert.rejects(reviewAnalytics(owner,"2020-01-01",today),/three years/);
 }finally{await prisma.project.deleteMany({where:{userId:{in:[owner.id,other.id]}}});await prisma.user.deleteMany({where:{id:{in:[owner.id,other.id]}}});await prisma.$disconnect();}
});
