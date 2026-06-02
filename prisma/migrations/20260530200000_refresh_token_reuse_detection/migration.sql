ALTER TABLE "refresh_tokens"
ADD COLUMN "familyId" TEXT,
ADD COLUMN "revokedReason" TEXT,
ADD COLUMN "replacedByTokenId" TEXT;

UPDATE "refresh_tokens"
SET "familyId" = "id"
WHERE "familyId" IS NULL;

ALTER TABLE "refresh_tokens"
ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX "refresh_tokens_userId_familyId_revokedAt_idx"
ON "refresh_tokens"("userId", "familyId", "revokedAt");
