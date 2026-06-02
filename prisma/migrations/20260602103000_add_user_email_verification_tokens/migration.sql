ALTER TABLE "users"
ADD COLUMN "emailVerifyTokenHash" TEXT,
ADD COLUMN "emailVerifyExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_emailVerifyTokenHash_key" ON "users"("emailVerifyTokenHash");
