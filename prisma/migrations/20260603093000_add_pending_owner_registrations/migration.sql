-- CreateTable
CREATE TABLE "pending_owner_registrations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "taxCode" TEXT,
    "businessType" "BusinessType" NOT NULL,
    "verificationTokenHash" TEXT NOT NULL,
    "verificationExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_owner_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_owner_registrations_email_key" ON "pending_owner_registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pending_owner_registrations_slug_key" ON "pending_owner_registrations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pending_owner_registrations_verificationTokenHash_key" ON "pending_owner_registrations"("verificationTokenHash");
