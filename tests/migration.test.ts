import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const database = process.env.BOARDO_TEST_DATABASE_URL;
test("upgrade preserves legacy tasks, dates and private ownership", { skip: !database }, async () => {
  const url = new URL(database!);
  assert.ok(["localhost", "127.0.0.1", "postgres"].includes(url.hostname) && url.pathname.endsWith("_test"), "Use an isolated local *_test database.");
  const prisma = new PrismaClient({ datasourceUrl: database });
  const schema = "migration_test_" + crypto.randomUUID().replaceAll("-", "");
  const original = await readFile(new URL("../prisma/migrations/20260311021407_build_t1/migration.sql", import.meta.url), "utf8");
  const upgrade = await readFile(new URL("../prisma/migrations/202610060001_personal_assistant/migration.sql", import.meta.url), "utf8");
  try {
    await prisma.$transaction(async (tx) => {
      // The generated schema name contains only a fixed prefix and hexadecimal UUID.
      await tx.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "' + schema + '"');
      for (const sql of original.split(";").filter((part) => part.trim())) await tx.$executeRawUnsafe(sql);
      await tx.$executeRaw`INSERT INTO "Project" ("id", "name", "order") VALUES ('legacy-project', 'Existing project', 3)`;
      await tx.$executeRaw`INSERT INTO "Task" ("id", "projectId", "title", "priority", "dueDate", "column", "orderInColumn", "updatedAt") VALUES ('legacy-task', 'legacy-project', 'Keep this task', 'High', '2026-10-10'::timestamp, 'Done', 2, '2026-10-01'::timestamp)`;
      for (const sql of upgrade.split(";").filter((part) => part.trim())) await tx.$executeRawUnsafe(sql);
      const rows = await tx.$queryRaw<Array<{ id: string; title: string; dueDate: Date; column: string; orderInColumn: number; completedAt: Date | null; userId: string | null; version: number }>>`SELECT t."id", t."title", t."dueDate", t."column", t."orderInColumn", t."completedAt", p."userId", t."version" FROM "Task" t JOIN "Project" p ON p."id" = t."projectId"`;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, "legacy-task");
      assert.equal(rows[0].title, "Keep this task");
      assert.equal(rows[0].dueDate.toISOString(), "2026-10-10T00:00:00.000Z");
      assert.equal(rows[0].column, "Done");
      assert.equal(rows[0].orderInColumn, 2);
      assert.equal(rows[0].completedAt, null);
      assert.equal(rows[0].userId, null);
      assert.equal(rows[0].version, 0);
      await tx.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
    }, { timeout: 20000 });
  } finally { await prisma.$disconnect(); }
});
