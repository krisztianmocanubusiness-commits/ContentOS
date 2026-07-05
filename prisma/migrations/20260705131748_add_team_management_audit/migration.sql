-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TeamMemberInvited';
ALTER TYPE "AuditAction" ADD VALUE 'TeamMemberRoleChanged';
ALTER TYPE "AuditAction" ADD VALUE 'TeamMemberRemoved';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "workspaceMembershipId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_workspaceMembershipId_idx" ON "AuditLog"("workspaceMembershipId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceMembershipId_fkey" FOREIGN KEY ("workspaceMembershipId") REFERENCES "WorkspaceMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
