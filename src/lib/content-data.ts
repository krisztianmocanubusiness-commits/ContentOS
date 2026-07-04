import "server-only";

import { prisma } from "@/lib/prisma";
import { formatRelativeTime, formatShortDate } from "@/lib/format";
import type { ContentItem, ContentStatus } from "@/lib/mock-data";
import { ContentStatus as DbContentStatus } from "@/generated/prisma/enums";

const STATUS_DB_TO_UI: Record<string, ContentStatus> = {
  [DbContentStatus.Draft]: "Draft",
  [DbContentStatus.Scheduled]: "Scheduled",
  [DbContentStatus.Published]: "Published",
  [DbContentStatus.NeedsReview]: "Needs Review",
};

/**
 * Loads a workspace's content items (with comments, review history, and
 * linked asset ids) from the database and reshapes them into the same
 * `ContentItem` shape the UI already renders, so ContentBoard and its
 * children didn't need to change when the data source moved off
 * mock-data.ts. Comments/review timestamps are computed relative to now
 * on every call rather than stored as strings, since they're read from
 * real `createdAt` columns.
 */
export async function getWorkspaceContent(workspaceId: string): Promise<ContentItem[]> {
  const rows = await prisma.contentItem.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      assets: { select: { id: true } },
      comments: { orderBy: { createdAt: "asc" } },
      reviewEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    status: STATUS_DB_TO_UI[row.status],
    platform: row.platform,
    date: formatShortDate(row.scheduledAt),
    author: row.authorName,
    authorInitials: row.authorInitials,
    body: row.body,
    tags: row.tags,
    assetIds: row.assets.map((asset) => asset.id),
    comments: row.comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      authorInitials: comment.authorInitials,
      body: comment.body,
      timestamp: formatRelativeTime(comment.createdAt),
    })),
    reviewHistory: row.reviewEvents.map((event) => ({
      id: event.id,
      action: event.action,
      by: event.byName,
      byInitials: event.byInitials,
      timestamp: formatRelativeTime(event.createdAt),
      note: event.note ?? undefined,
    })),
  }));
}
