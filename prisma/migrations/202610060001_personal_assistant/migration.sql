-- Additive migration. Existing projects remain unowned/private until setup:owner --claim-existing.
CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "timezone" TEXT NOT NULL DEFAULT 'Asia/Calcutta', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "Session" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "expiresAt" TIMESTAMP(3) NOT NULL, "credentialVersion" TEXT NOT NULL);
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "LoginWindow" ("key" TEXT PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL);
ALTER TABLE "Project" ADD COLUMN "userId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Project_userId_archived_order_idx" ON "Project"("userId", "archived", "order");
CREATE TABLE "Goal" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "title" TEXT NOT NULL, "area" TEXT NOT NULL DEFAULT 'Work', "importance" INTEGER NOT NULL DEFAULT 3 CHECK ("importance" BETWEEN 1 AND 5), "archived" BOOLEAN NOT NULL DEFAULT false);
CREATE INDEX "Goal_userId_archived_idx" ON "Goal"("userId", "archived");
ALTER TABLE "Task"
  ADD COLUMN "goalId" TEXT REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN "notes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 30 CHECK ("estimatedMinutes" BETWEEN 5 AND 720),
  ADD COLUMN "energy" TEXT NOT NULL DEFAULT 'Medium' CHECK ("energy" IN ('Low','Medium','High')),
  ADD COLUMN "context" TEXT NOT NULL DEFAULT 'Any' CHECK ("context" IN ('Any','Desk','Phone','Outside')),
  ADD COLUMN "blockedReason" TEXT,
  ADD COLUMN "deferredUntil" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dependsOnId" TEXT REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_priority_check" CHECK ("priority" IN ('Low','Medium','High'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_column_check" CHECK ("column" IN ('Todo','InProgress','Done'));
CREATE INDEX "Task_projectId_column_orderInColumn_idx" ON "Task"("projectId", "column", "orderInColumn");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
CREATE TABLE "DailyIntent" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "date" TEXT NOT NULL,
  "outcomes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "outcomeTaskIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "pinnedTaskIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "availableMinutes" INTEGER NOT NULL DEFAULT 240 CHECK ("availableMinutes" BETWEEN 0 AND 720), "bufferPercent" INTEGER NOT NULL DEFAULT 20 CHECK ("bufferPercent" BETWEEN 0 AND 50),
  "energy" TEXT NOT NULL DEFAULT 'Medium', "context" TEXT NOT NULL DEFAULT 'Desk', "review" TEXT NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX "DailyIntent_userId_date_key" ON "DailyIntent"("userId", "date");
CREATE TABLE "ActivityEvent" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "taskId" TEXT, "action" TEXT NOT NULL, "detail" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");
CREATE TABLE "FocusSession" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3), "minutes" INTEGER NOT NULL DEFAULT 0);
CREATE INDEX "FocusSession_userId_startedAt_idx" ON "FocusSession"("userId", "startedAt");
CREATE UNIQUE INDEX "FocusSession_one_active_per_user" ON "FocusSession"("userId") WHERE "endedAt" IS NULL;
CREATE TABLE "DigestRun" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, "date" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "payload" JSONB NOT NULL, "lockedAt" TIMESTAMP(3), "providerId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "DigestRun_userId_date_key" ON "DigestRun"("userId", "date");
