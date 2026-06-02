ALTER TABLE "audit_logs"
ADD COLUMN "organizationId" TEXT,
ALTER COLUMN "actorIp" DROP NOT NULL;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "audit_logs_organizationId_createdAt_idx"
ON "audit_logs"("organizationId", "createdAt");

CREATE INDEX "audit_logs_action_createdAt_idx"
ON "audit_logs"("action", "createdAt");

CREATE INDEX "audit_logs_targetTable_targetId_createdAt_idx"
ON "audit_logs"("targetTable", "targetId", "createdAt");
