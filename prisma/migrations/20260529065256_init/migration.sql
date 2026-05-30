-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER', 'GUEST');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('HOMESTAY', 'HOTEL', 'RESORT', 'GUESTHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SubscriptionPlanName" AS ENUM ('LU_HANH', 'TRU_CHAN', 'AN_CU', 'BAN_DIA');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTH', 'CENTRAL', 'SOUTH');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'DORMITORY', 'VILLA');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'BUNK');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT_WEB', 'DIRECT_APP', 'WALK_IN', 'PHONE', 'BOOKING_COM', 'AIRBNB', 'AGODA');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ORG_MANAGER', 'BRANCH_MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CHECKOUT_CLEAN', 'DAILY_REFRESH', 'DEEP_CLEAN', 'MAINTENANCE_PREP', 'INSPECTION');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "PriceAdjustType" AS ENUM ('FIXED', 'PERCENT_INCREASE', 'PERCENT_DECREASE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_NEW', 'BOOKING_CANCELLED', 'BOOKING_CHECKIN', 'BOOKING_CHECKOUT', 'BOOKING_EXTENDED', 'HOUSEKEEPING_ASSIGNED', 'HOUSEKEEPING_DONE', 'REVIEW_NEW', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "taxCode" TEXT,
    "businessType" "BusinessType" NOT NULL,
    "logoUrl" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" "SubscriptionPlanName" NOT NULL,
    "displayName" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(12,2) NOT NULL,
    "yearlyPrice" DECIMAL(12,2),
    "maxBranches" INTEGER NOT NULL,
    "maxRoomsPerBranch" INTEGER NOT NULL,
    "canListOnMarketplace" BOOLEAN NOT NULL,
    "hasAdvancedReports" BOOLEAN NOT NULL,
    "hasPrioritySupport" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "description" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '12:00',
    "bufferHours" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isListedOnMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_images" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bedCount" INTEGER NOT NULL,
    "bedType" "BedType" NOT NULL,
    "floorNumber" INTEGER,
    "roomAmenities" JSONB NOT NULL DEFAULT '[]',
    "bufferHours" INTEGER,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_images" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rates" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_pricings" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "rateId" TEXT,
    "label" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "overridePrice" DECIMAL(12,2) NOT NULL,
    "priceAdjustType" "PriceAdjustType" NOT NULL,
    "adjustValue" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_pricings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nationalId" TEXT,
    "nationality" TEXT,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalStays" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdByStaffId" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "actualCheckOut" TIMESTAMP(3),
    "rateId" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "priceNote" TEXT,
    "depositAmount" DECIMAL(12,2),
    "numAdults" INTEGER NOT NULL,
    "numChildren" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "source" "BookingSource" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_extensions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "extraHours" INTEGER NOT NULL,
    "extraPrice" DECIMAL(12,2) NOT NULL,
    "newCheckOut" TIMESTAMP(3) NOT NULL,
    "approvedByStaffId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "position" TEXT NOT NULL,
    "staffRole" "StaffRole" NOT NULL,
    "hireDate" DATE NOT NULL,
    "terminatedDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_tasks" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bookingId" TEXT,
    "assignedToStaffId" TEXT,
    "assignedByStaffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "replyFromStaff" TEXT,
    "repliedByStaffId" TEXT,
    "repliedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorIp" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_slug_key" ON "provinces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingCode_key" ON "bookings"("bookingCode");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_images" ADD CONSTRAINT "branch_images_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_pricings" ADD CONSTRAINT "room_pricings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_pricings" ADD CONSTRAINT "room_pricings_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "room_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "room_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extensions" ADD CONSTRAINT "booking_extensions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extensions" ADD CONSTRAINT "booking_extensions_approvedByStaffId_fkey" FOREIGN KEY ("approvedByStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_assignedToStaffId_fkey" FOREIGN KEY ("assignedToStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_assignedByStaffId_fkey" FOREIGN KEY ("assignedByStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_repliedByStaffId_fkey" FOREIGN KEY ("repliedByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
