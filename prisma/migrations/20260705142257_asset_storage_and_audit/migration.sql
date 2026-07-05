/*
  Warnings:

  - You are about to drop the column `sizeLabel` on the `Asset` table. All the data in the column will be lost.
  - Added the required column `byteSize` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('Active', 'Deleted');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'AssetUploaded';
ALTER TYPE "AuditAction" ADD VALUE 'AssetRenamed';
ALTER TYPE "AuditAction" ADD VALUE 'AssetTagsChanged';
ALTER TYPE "AuditAction" ADD VALUE 'AssetMoved';
ALTER TYPE "AuditAction" ADD VALUE 'AssetDeleted';
ALTER TYPE "AuditAction" ADD VALUE 'AssetRestored';

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "sizeLabel",
ADD COLUMN     "byteSize" INTEGER NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "thumbnailKey" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "assetId" TEXT;

-- CreateIndex
CREATE INDEX "Asset_workspaceId_status_idx" ON "Asset"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_assetId_idx" ON "AuditLog"("assetId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
