import { resetTestOwner } from "./reset";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
test.beforeEach(resetTestOwner);
test("analytics, timer controls, history corrections and three-year exports", async ({ page }) => {
  const db = new PrismaClient({datasourceUrl:process.env.BOARDO_TEST_DATABASE_URL});
  const origin="http://127.0.0.1:3100",headers={Origin:origin};
  const login=await page.request.post("/api/auth/login",{headers,data:{password:"boardo-test-password"}});expect(login.status()).toBe(200);
  const owner=await db.user.findUniqueOrThrow({where:{email:"e2e@example.invalid"}});
  const project=await db.project.create({data:{userId:owner.id,name:"Analytics fixture "+Date.now()}});
  const goal=await db.goal.create({data:{userId:owner.id,title:"Health focus fixture"}});
  const task=await db.task.create({data:{projectId:project.id,title:"Analytics focus fixture",goalId:goal.id}});
  try {
    const started=await page.request.post("/api/tasks/"+task.id+"/action",{headers,data:{version:0,action:"start",minutes:15}});expect(started.status()).toBe(200);
    await page.goto("/review");const dock=page.getByRole("complementary",{name:"Focus timer"});
    await expect(dock.getByText("Analytics focus fixture",{exact:true})).toBeVisible();
    await dock.getByRole("button",{name:"+15 min",exact:true}).click();
    await expect.poll(async()=>{const s=await db.focusSession.findFirstOrThrow({where:{userId:owner.id,endedAt:null}});return s.plannedMinutes;}).toBe(30);
    await dock.getByRole("button",{name:"Pause timer"}).click();await expect(dock.getByRole("button",{name:"Resume 25 min"})).toBeVisible();
    await dock.getByRole("button",{name:"Resume 25 min"}).click();await expect(dock.getByRole("button",{name:"Pause timer"})).toBeVisible();
    await page.reload();await expect(dock.getByRole("button",{name:"Pause timer"})).toBeVisible();
    await dock.getByRole("button",{name:"Pause timer"}).click();await expect(dock.getByRole("button",{name:"Resume 25 min"})).toBeVisible();
    const session=await db.focusSession.findFirstOrThrow({where:{taskId:task.id},orderBy:{startedAt:"desc"}});
    const now=new Date();await db.focusSession.update({where:{id:session.id},data:{startedAt:new Date(now.getTime()-600000),endedAt:new Date(now.getTime()-300000)}});
    await db.activityEvent.createMany({data:Array.from({length:35},(_,i)=>({userId:owner.id,taskId:task.id,taskTitle:task.title,action:"test_progress",detail:"Progress record "+i}))});
    await page.reload();await page.getByRole("button",{name:"7 days",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Time by goal"})).toBeVisible();
    await expect(page.getByText("Health focus fixture",{exact:true}).first()).toBeVisible();
    const row=page.locator(".session-row").filter({hasText:"Analytics focus fixture"}).filter({hasText:"5m in this range"}).first();await row.getByRole("button",{name:"Correct time"}).click();
    await row.getByLabel("Corrected total minutes").fill("1");await row.getByLabel("Reason for correction").fill("Timer included an interruption");
    await row.getByRole("button",{name:"Save correction"}).click();await expect(page.getByText("Corrected: Timer included an interruption",{exact:false})).toBeVisible();
    const stale=await page.request.post("/api/focus",{headers,data:{id:session.id,version:session.version,action:"correct",minutes:0,reason:"Stale edit"}});expect(stale.status()).toBe(409);
    const activity=page.getByRole("list",{name:"Scrollable activity history"});await expect(activity).toBeVisible();expect(await activity.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
    await page.getByRole("button",{name:"3 years",exact:true}).click();await expect(page.getByRole("button",{name:"Export daily CSV"})).toBeEnabled({timeout:20000});
    expect(await page.locator(".heatmap button").count()).toBeGreaterThan(1095);
    const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export daily CSV"}).click();expect((await download).suggestedFilename()).toMatch(/boardo-.*\.csv/);
    await page.screenshot({path:"test-results/review-desktop.png",fullPage:false});
    await page.setViewportSize({width:390,height:844});await expect(page.locator("body")).toHaveJSProperty("scrollWidth",390);
    await page.screenshot({path:"test-results/review-mobile.png",fullPage:false});
  } finally {
    await db.focusSession.deleteMany({where:{projectId:project.id}});
    await db.activityEvent.deleteMany({where:{taskId:task.id}});
    await db.project.delete({where:{id:project.id}});await db.goal.delete({where:{id:goal.id}});await db.$disconnect();
  }
});
