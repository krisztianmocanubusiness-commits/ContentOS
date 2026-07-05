import "server-only";

import { cache } from "react";

import { AuditAction, ContentStatus as DbContentStatus } from "@/generated/prisma/enums";
import { formatRelativeTime, formatShortDate } from "@/lib/format";
import type { ContentStatus, Platform } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

export type ContentStatusCounts = {
  total: number;
  draft: number;
  needsReview: number;
  scheduled: number;
  published: number;
};

export type DashboardContentSummary = {
  id: string;
  title: string;
  status: ContentStatus;
  platform: Platform;
  author: string;
  date: string;
};

export type DashboardUpcomingEvent = {
  id: string;
  title: string;
  platform: Platform;
  scheduledAt: Date;
};

const ACTIVITY_LABEL: Record<AuditAction, string> = {
  [AuditAction.ContentSubmitted]: "submitted",
  [AuditAction.ContentApproved]: "approved",
  [AuditAction.ContentChangesRequested]: "requested changes on",
  [AuditAction.ContentCommented]: "commented on",
  [AuditAction.CalendarEventCreated]: "scheduled",
  [AuditAction.CalendarEventUpdated]: "updated",
  [AuditAction.CalendarEventRescheduled]: "rescheduled",
  [AuditAction.CalendarEventDeleted]: "deleted",
  [AuditAction.TeamMemberInvited]: "invited a teammate",
  [AuditAction.TeamMemberRoleChanged]: "changed a teammate's role",
  [AuditAction.TeamMemberRemoved]: "removed a teammate",
  [AuditAction.AssetUploaded]: "uploaded",
  [AuditAction.AssetRenamed]: "renamed",
  [AuditAction.AssetTagsChanged]: "retagged",
  [AuditAction.AssetMoved]: "moved",
  [AuditAction.AssetDeleted]: "deleted",
  [AuditAction.AssetRestored]: "restored",
  [AuditAction.SocialAccountConnected]: "connected an account",
  [AuditAction.SocialAccountDisconnected]: "disconnected an account",
  [AuditAction.SocialAccountReconnected]: "reconnected an account",
  [AuditAction.SocialAccountRenamed]: "renamed an account",
  [AuditAction.SocialAccountStatusChanged]: "flagged an account for reauthorization",
};

export type DashboardActivityEntry = {
  id: string;
  actorName: string;
  verb: string;
  contentTitle: string | null;
  timestamp: string;
};

export type DashboardTeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  lastActive: string | null;
};

export type DashboardWorkspaceStats = {
  teamMemberCount: number;
  totalContent: number;
};

export type DashboardData = {
  statusCounts: ContentStatusCounts;
  recentContent: DashboardContentSummary[];
  pendingApprovals: DashboardContentSummary[];
  recentActivity: DashboardActivityEntry[];
  notifications: DashboardActivityEntry[];
  team: DashboardTeamMember[];
  workspaceStats: DashboardWorkspaceStats;
  upcomingEvents: DashboardUpcomingEvent[];
};

const STATUS_DB_TO_UI: Record<string, ContentStatus> = {
  [DbContentStatus.Draft]: "Draft",
  [DbContentStatus.Scheduled]: "Scheduled",
  [DbContentStatus.Published]: "Published",
  [DbContentStatus.NeedsReview]: "Needs Review",
};

function toContentSummary(row: {
  id: string;
  title: string;
  status: string;
  platform: string;
  authorName: string;
  scheduledAt: Date;
}): DashboardContentSummary {
  return {
    id: row.id,
    title: row.title,
    status: STATUS_DB_TO_UI[row.status],
    platform: row.platform as Platform,
    author: row.authorName,
    date: formatShortDate(row.scheduledAt),
  };
}

function toActivityEntry(row: {
  id: string;
  actorName: string;
  action: AuditAction;
  createdAt: Date;
  contentItem: { title: string } | null;
  calendarEvent: { title: string } | null;
}): DashboardActivityEntry {
  return {
    id: row.id,
    actorName: row.actorName,
    verb: ACTIVITY_LABEL[row.action],
    contentTitle: row.contentItem?.title ?? row.calendarEvent?.title ?? null,
    timestamp: formatRelativeTime(row.createdAt),
  };
}

/**
 * Loads every piece of data the workspace dashboard renders in one place,
 * running the independent queries in parallel (a single groupBy or
 * findMany each — no per-row follow-up queries, so nothing here scales
 * with the number of content items or team members). Wrapped in React's
 * cache() for per-request dedup, matching requireWorkspaceAccess.
 *
 * Not wrapped in a persistent cross-request cache (e.g. unstable_cache):
 * every widget here (status counts, pending approvals, activity feed)
 * changes on nearly every content action, and a stale "pending approvals"
 * count would read as a bug, not a performance win.
 */
export const getDashboardData = cache(
  async (workspaceId: string, currentUserId: string): Promise<DashboardData> => {
    const now = new Date();

    const [
      statusGroups,
      recentContentRows,
      pendingApprovalRows,
      recentActivityRows,
      notificationRows,
      memberships,
      activityByActor,
      upcomingEventRows,
    ] = await Promise.all([
      prisma.contentItem.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { _all: true },
      }),
      prisma.contentItem.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          platform: true,
          authorName: true,
          scheduledAt: true,
        },
      }),
      prisma.contentItem.findMany({
        where: { workspaceId, status: DbContentStatus.NeedsReview },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          platform: true,
          authorName: true,
          scheduledAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          actorName: true,
          action: true,
          createdAt: true,
          contentItem: { select: { title: true } },
          calendarEvent: { select: { title: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: { workspaceId, actorId: { not: currentUserId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          actorName: true,
          action: true,
          createdAt: true,
          contentItem: { select: { title: true } },
          calendarEvent: { select: { title: true } },
        },
      }),
      prisma.workspaceMembership.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, name: true, initials: true } },
        },
      }),
      prisma.auditLog.groupBy({
        by: ["actorId"],
        where: { workspaceId },
        _max: { createdAt: true },
      }),
      prisma.calendarEvent.findMany({
        where: { workspaceId, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: "asc" },
        take: 4,
        select: { id: true, title: true, platform: true, scheduledAt: true },
      }),
    ]);

    const statusCounts: ContentStatusCounts = {
      total: 0,
      draft: 0,
      needsReview: 0,
      scheduled: 0,
      published: 0,
    };
    for (const group of statusGroups) {
      const count = group._count._all;
      statusCounts.total += count;
      if (group.status === DbContentStatus.Draft) statusCounts.draft = count;
      if (group.status === DbContentStatus.NeedsReview) statusCounts.needsReview = count;
      if (group.status === DbContentStatus.Scheduled) statusCounts.scheduled = count;
      if (group.status === DbContentStatus.Published) statusCounts.published = count;
    }

    const lastActiveByActor = new Map(
      activityByActor.map((entry) => [entry.actorId, entry._max.createdAt])
    );

    const team: DashboardTeamMember[] = memberships.map((membership) => {
      const lastActive = lastActiveByActor.get(membership.userId) ?? null;
      return {
        id: membership.userId,
        name: membership.user.name,
        initials: membership.user.initials,
        role: membership.role,
        lastActive: lastActive ? formatRelativeTime(lastActive) : null,
      };
    });

    return {
      statusCounts,
      recentContent: recentContentRows.map(toContentSummary),
      pendingApprovals: pendingApprovalRows.map(toContentSummary),
      recentActivity: recentActivityRows.map(toActivityEntry),
      notifications: notificationRows.map(toActivityEntry),
      team,
      workspaceStats: {
        teamMemberCount: memberships.length,
        totalContent: statusCounts.total,
      },
      upcomingEvents: upcomingEventRows.map((row) => ({
        id: row.id,
        title: row.title,
        platform: row.platform as Platform,
        scheduledAt: row.scheduledAt,
      })),
    };
  }
);
