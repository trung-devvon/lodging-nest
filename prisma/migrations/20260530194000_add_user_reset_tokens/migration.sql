ALTER TABLE "users"
ADD COLUMN "resetTokenHash" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_resetTokenHash_key" ON "users"("resetTokenHash");
