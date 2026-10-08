ALTER TABLE "FocusSession" DROP CONSTRAINT "FocusSession_taskId_fkey";
ALTER TABLE "FocusSession" ALTER COLUMN "taskId" DROP NOT NULL;
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FocusSession"
 ADD COLUMN "plannedMinutes" INTEGER NOT NULL DEFAULT 25,
 ADD COLUMN "limitAt" TIMESTAMP(3),
 ADD COLUMN "taskTitle" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "projectId" TEXT,
 ADD COLUMN "projectName" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "goalId" TEXT,
 ADD COLUMN "goalTitle" TEXT,
 ADD COLUMN "attribution" TEXT NOT NULL DEFAULT 'captured',
 ADD COLUMN "stopReason" TEXT,
 ADD COLUMN "correctionNote" TEXT,
 ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
UPDATE "FocusSession" f SET "taskTitle"=t.title, "projectId"=t."projectId", "projectName"=p.name,
 "goalId"=t."goalId", "goalTitle"=g.title, "attribution"='legacy'
 FROM "Task" t JOIN "Project" p ON p.id=t."projectId" LEFT JOIN "Goal" g ON g.id=t."goalId" WHERE f."taskId"=t.id;
-- Existing open sessions are retained but bounded at migration time, never counted indefinitely.
UPDATE "FocusSession" SET "limitAt"=CURRENT_TIMESTAMP, "plannedMinutes"=180 WHERE "endedAt" IS NULL;
ALTER TABLE "ActivityEvent" ADD COLUMN "taskTitle" TEXT, ADD COLUMN "projectId" TEXT, ADD COLUMN "projectName" TEXT, ADD COLUMN "goalId" TEXT, ADD COLUMN "goalTitle" TEXT;
UPDATE "ActivityEvent" e SET "taskTitle"=t.title, "projectId"=t."projectId", "projectName"=p.name, "goalId"=t."goalId", "goalTitle"=g.title FROM "Task" t JOIN "Project" p ON p.id=t."projectId" LEFT JOIN "Goal" g ON g.id=t."goalId" WHERE e."taskId"=t.id;
CREATE INDEX "FocusSession_userId_endedAt_idx" ON "FocusSession"("userId","endedAt");
