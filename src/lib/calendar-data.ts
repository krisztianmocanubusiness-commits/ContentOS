import "server-only";

import { formatTimeLabel, toISODate } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

/**
 * Loads every calendar event in a workspace and reshapes it into the same
 * `CalendarEvent` shape (date/time as display strings) the Month/Week/Day
 * views already render, so none of them needed to change for the move off
 * mock data. Fetches the whole workspace's events rather than a date
 * range, matching the existing client-side month/week/day navigation
 * (instant, no round trip per view change) — the same tradeoff the
 * Content list already makes by fetching everything up front.
 */
export async function getWorkspaceCalendarEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const rows = await prisma.calendarEvent.findMany({
    where: { workspaceId },
    orderBy: { scheduledAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    date: toISODate(row.scheduledAt),
    time: formatTimeLabel(row.scheduledAt),
    title: row.title,
    platform: row.platform,
  }));
}
