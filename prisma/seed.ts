import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});

  const projects = await Promise.all([
    prisma.project.create({ data: { name: "A", order: 0 } }),
    prisma.project.create({ data: { name: "B", order: 1 } }),
    prisma.project.create({ data: { name: "C", order: 2 } }),
    prisma.project.create({ data: { name: "General", order: 3 } }),
  ]);

  await prisma.task.createMany({
    data: [
      { projectId: projects[0].id, title: "Sample task A1", priority: "High", column: "Todo", orderInColumn: 0 },
      { projectId: projects[3].id, title: "Sample general task", priority: "Medium", column: "Todo", orderInColumn: 0 },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
