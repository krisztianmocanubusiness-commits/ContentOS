-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CalendarEventCreated';
ALTER TYPE "AuditAction" ADD VALUE 'CalendarEventUpdated';
ALTER TYPE "AuditAction" ADD VALUE 'CalendarEventRescheduled';
ALTER TYPE "AuditAction" ADD VALUE 'CalendarEventDeleted';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "calendarEventId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_calendarEventId_idx" ON "AuditLog"("calendarEventId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
