/*
  Warnings:

  - Added the required column `displayName` to the `SocialAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SocialAccountConnected';
ALTER TYPE "AuditAction" ADD VALUE 'SocialAccountDisconnected';
ALTER TYPE "AuditAction" ADD VALUE 'SocialAccountReconnected';
ALTER TYPE "AuditAction" ADD VALUE 'SocialAccountRenamed';
ALTER TYPE "AuditAction" ADD VALUE 'SocialAccountStatusChanged';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Platform" ADD VALUE 'Facebook';
ALTER TYPE "Platform" ADD VALUE 'Threads';
ALTER TYPE "Platform" ADD VALUE 'Pinterest';

-- AlterEnum
ALTER TYPE "SocialStatus" ADD VALUE 'Needs Reauth';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "socialAccountId" TEXT;

-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "scopes" TEXT[],
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AuditLog_socialAccountId_idx" ON "AuditLog"("socialAccountId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
