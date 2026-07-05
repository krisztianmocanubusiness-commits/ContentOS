/*
  Warnings:

  - Added the required column `updatedAt` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InboxItemType" AS ENUM ('Comment', 'Direct Message', 'Mention', 'Notification');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('Open', 'Resolved');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ConversationMarkedRead';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationMarkedUnread';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationArchived';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationUnarchived';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationAssigned';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationNoteAdded';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationResolved';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationReopened';
ALTER TYPE "AuditAction" ADD VALUE 'ConversationReplied';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "conversationId" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assignedToMembershipId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'Open',
ADD COLUMN     "type" "InboxItemType" NOT NULL DEFAULT 'Direct Message',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ConversationNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationNote_conversationId_idx" ON "ConversationNote"("conversationId");

-- CreateIndex
CREATE INDEX "AuditLog_conversationId_idx" ON "AuditLog"("conversationId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_archived_idx" ON "Conversation"("workspaceId", "archived");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_status_idx" ON "Conversation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Conversation_assignedToMembershipId_idx" ON "Conversation"("assignedToMembershipId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToMembershipId_fkey" FOREIGN KEY ("assignedToMembershipId") REFERENCES "WorkspaceMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
