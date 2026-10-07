import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
async function main() {
  const email = process.env.BOARDO_OWNER_EMAIL?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Set BOARDO_OWNER_EMAIL before running setup.");
  const user = await prisma.user.upsert({ where: { email }, create: { email }, update: {} });
  const count = await prisma.project.count({ where: { userId: null } });
  if (process.argv.includes("--claim-existing")) {
    const result = await prisma.project.updateMany({ where: { userId: null }, data: { userId: user.id, version: { increment: 1 } } });
    console.log(`Assigned ${result.count} unowned projects to the configured owner. Existing tasks and dates were preserved.`);
  } else console.log(`Owner ready. ${count} unowned projects remain private. Add --claim-existing to assign them explicitly.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
