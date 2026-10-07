import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (process.env.ALLOW_DEVELOPMENT_SEED !== "true" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.NODE_ENV === "production") throw new Error("Seeding requires ALLOW_DEVELOPMENT_SEED=true and a local development database.");
  const email = process.env.BOARDO_OWNER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set BOARDO_OWNER_EMAIL.");
  const user = await prisma.user.upsert({ where: { email }, create: { email }, update: {} });
  if (await prisma.project.count({ where: { userId: user.id } })) { console.log("Existing projects preserved; no seed changes."); return; }
  const goal = await prisma.goal.create({ data: { userId: user.id, title: "Make steady progress on meaningful work", area: "Work", importance: 4 } });
  const project = await prisma.project.create({ data: { name: "My next chapter", userId: user.id } });
  await prisma.task.createMany({ data: [
    { projectId: project.id, goalId: goal.id, title: "Outline the next milestone", priority: "High", estimatedMinutes: 30, energy: "Medium", context: "Desk", orderInColumn: 0 },
    { projectId: project.id, title: "Clear one small admin task", estimatedMinutes: 10, energy: "Low", context: "Any", orderInColumn: 1 },
  ] });
  console.log("Created a small starter workspace.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
