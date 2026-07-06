/*
  Warnings:

  - You are about to drop the `Deal` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MonetizationType" AS ENUM ('Income', 'Expense');

-- CreateEnum
CREATE TYPE "MonetizationCategory" AS ENUM ('Sponsorship', 'Affiliate', 'Platform Revenue', 'Merchandise', 'Digital Product', 'Other Income', 'Expense');

-- CreateEnum
CREATE TYPE "MonetizationStatus" AS ENUM ('Negotiating', 'In Progress', 'Pending', 'Paid', 'Cancelled');

-- CreateEnum
CREATE TYPE "MonetizationProvider" AS ENUM ('Manual', 'YouTube', 'TikTok', 'Patreon', 'Stripe', 'Lemon Squeezy');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MonetizationEntryCreated';
ALTER TYPE "AuditAction" ADD VALUE 'MonetizationEntryUpdated';
ALTER TYPE "AuditAction" ADD VALUE 'MonetizationEntryStatusChanged';
ALTER TYPE "AuditAction" ADD VALUE 'MonetizationEntryDeleted';

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_workspaceId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "monetizationEntryId" TEXT;

-- DropTable
DROP TABLE "Deal";

-- DropEnum
DROP TYPE "DealStatus";

-- CreateTable
CREATE TABLE "MonetizationEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "MonetizationType" NOT NULL,
    "category" "MonetizationCategory" NOT NULL,
    "provider" "MonetizationProvider" NOT NULL DEFAULT 'Manual',
    "platform" "Platform",
    "title" TEXT NOT NULL,
    "counterpartyName" TEXT,
    "description" TEXT,
    "status" "MonetizationStatus" NOT NULL DEFAULT 'Pending',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonetizationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonetizationEntry_workspaceId_idx" ON "MonetizationEntry"("workspaceId");

-- CreateIndex
CREATE INDEX "MonetizationEntry_workspaceId_type_idx" ON "MonetizationEntry"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "MonetizationEntry_workspaceId_category_idx" ON "MonetizationEntry"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "MonetizationEntry_workspaceId_status_idx" ON "MonetizationEntry"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MonetizationEntry_workspaceId_date_idx" ON "MonetizationEntry"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_monetizationEntryId_idx" ON "AuditLog"("monetizationEntryId");

-- AddForeignKey
ALTER TABLE "MonetizationEntry" ADD CONSTRAINT "MonetizationEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_monetizationEntryId_fkey" FOREIGN KEY ("monetizationEntryId") REFERENCES "MonetizationEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
