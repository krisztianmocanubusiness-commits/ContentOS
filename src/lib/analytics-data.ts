import "server-only";

import { cache } from "react";

import { ContentStatus as DbContentStatus } from "@/generated/prisma/enums";
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics-range";
import { formatRelativeTime } from "@/lib/format";
import type { ContentStatus, Platform, ReviewAction } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

export type { AnalyticsRange };

const STATUS_DB_TO_UI: Record<string, ContentStatus> = {
  [DbContentStatus.Draft]: "Draft",
  [DbContentStatus.Scheduled]: "Scheduled",
  [DbContentStatus.Published]: "Published",
  [DbContentStatus.NeedsReview]: "Needs Review",
};

const RANGE_DAYS: Record<AnalyticsRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

export type DateRangeBounds = {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
};

/** The selected window and the immediately-preceding equal-length window, for trend comparisons. */
export function getRangeBounds(range: AnalyticsRange, now: Date = new Date()): DateRangeBounds {
  const days = RANGE_DAYS[range];
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - days * dayMs);
  const prevStart = new Date(now.getTime() - 2 * days * dayMs);
  return { start, end: now, prevStart, prevEnd: start };
}

/** A metric alongside its prior-period value, so callers can render their own trend indicator. */
export type PeriodCount = {
  current: number;
  previous: number;
};

export type ContentStatusSummary = {
  total: PeriodCount;
  draft: PeriodCount;
  published: PeriodCount;
  scheduled: PeriodCount;
};

/**
 * Content created in the selected window, broken down by its *current*
 * status, alongside the same breakdown for the prior equal-length window
 * (for trend arrows). ContentItem has no statusChangedAt column, so this
 * answers "of content created in this window, how much is now Published/
 * Scheduled/Draft" — not "how much became Published during this window."
 * That's a real limitation of the current schema, not a display choice.
 */
export async function getContentStatusSummary(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<ContentStatusSummary> {
  const [currentGroups, previousGroups] = await Promise.all([
    prisma.contentItem.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: bounds.start, lte: bounds.end } },
      _count: { _all: true },
    }),
    prisma.contentItem.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: bounds.prevStart, lt: bounds.prevEnd } },
      _count: { _all: true },
    }),
  ]);

  function tally(groups: typeof currentGroups) {
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      byStatus[g.status] = g._count._all;
      total += g._count._all;
    }
    return { total, byStatus };
  }

  const current = tally(currentGroups);
  const previous = tally(previousGroups);

  return {
    total: { current: current.total, previous: previous.total },
    draft: {
      current: current.byStatus[DbContentStatus.Draft] ?? 0,
      previous: previous.byStatus[DbContentStatus.Draft] ?? 0,
    },
    published: {
      current: current.byStatus[DbContentStatus.Published] ?? 0,
      previous: previous.byStatus[DbContentStatus.Published] ?? 0,
    },
    scheduled: {
      current: current.byStatus[DbContentStatus.Scheduled] ?? 0,
      previous: previous.byStatus[DbContentStatus.Scheduled] ?? 0,
    },
  };
}

export type CountBreakdown<Label extends string> = { label: Label; count: number }[];

/** Content created in the window, grouped by every status (including Needs Review). */
export async function getContentByStatus(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<CountBreakdown<ContentStatus>> {
  const groups = await prisma.contentItem.groupBy({
    by: ["status"],
    where: { workspaceId, createdAt: { gte: bounds.start, lte: bounds.end } },
    _count: { _all: true },
  });
  return groups.map((g) => ({ label: STATUS_DB_TO_UI[g.status], count: g._count._all }));
}

/** Content created in the window, grouped by platform. */
export async function getContentByPlatform(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<CountBreakdown<Platform>> {
  const groups = await prisma.contentItem.groupBy({
    by: ["platform"],
    where: { workspaceId, createdAt: { gte: bounds.start, lte: bounds.end } },
    _count: { _all: true },
  });
  return groups.map((g) => ({ label: g.platform as Platform, count: g._count._all }));
}

/**
 * Content created in the window, grouped by tag. Tags are a Postgres
 * String[] column, so this tallies in application code after a single
 * scoped, minimal-select query rather than reaching for raw SQL
 * unnesting — reasonable at this data scale, matching how the rest of
 * this codebase avoids raw queries. Capped to the top 8 tags.
 */
export async function getContentByTag(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<CountBreakdown<string>> {
  const rows = await prisma.contentItem.findMany({
    where: { workspaceId, createdAt: { gte: bounds.start, lte: bounds.end } },
    select: { tags: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export type ChartBucket = { label: string; value: number };

/** Splits [start, end] into `count` equal buckets with short display labels. */
function buildBuckets(start: Date, end: Date, count: number): { start: Date; end: Date; label: string }[] {
  const totalMs = end.getTime() - start.getTime();
  const bucketMs = totalMs / count;
  return Array.from({ length: count }, (_, i) => {
    const bucketStart = new Date(start.getTime() + i * bucketMs);
    const bucketEnd = new Date(start.getTime() + (i + 1) * bucketMs);
    return {
      start: bucketStart,
      end: bucketEnd,
      label: bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
}

/** Posts scheduled within the window, bucketed for a bar chart (7 buckets for 7d, 10 for 30d, 12 for 90d). */
export async function getPostingFrequency(
  workspaceId: string,
  range: AnalyticsRange,
  bounds: DateRangeBounds
): Promise<ChartBucket[]> {
  const bucketCount = range === "7d" ? 7 : range === "30d" ? 10 : 12;
  const buckets = buildBuckets(bounds.start, bounds.end, bucketCount);

  const rows = await prisma.contentItem.findMany({
    where: { workspaceId, scheduledAt: { gte: bounds.start, lte: bounds.end } },
    select: { scheduledAt: true },
  });

  const values = new Array(buckets.length).fill(0);
  for (const row of rows) {
    const time = row.scheduledAt.getTime();
    const index = buckets.findIndex((b) => time >= b.start.getTime() && time < b.end.getTime());
    if (index >= 0) values[index] += 1;
    else if (time === bounds.end.getTime()) values[values.length - 1] += 1;
  }

  return buckets.map((b, i) => ({ label: b.label, value: values[i] }));
}

/** Calendar posts scheduled in the window vs. the prior window. A separate model from ContentItem. */
export async function getCalendarActivity(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<PeriodCount> {
  const [current, previous] = await Promise.all([
    prisma.calendarEvent.count({
      where: { workspaceId, scheduledAt: { gte: bounds.start, lte: bounds.end } },
    }),
    prisma.calendarEvent.count({
      where: { workspaceId, scheduledAt: { gte: bounds.prevStart, lt: bounds.prevEnd } },
    }),
  ]);
  return { current, previous };
}

export type ReviewPipeline = {
  submitted: number;
  approved: number;
  changesRequested: number;
};

/** How many review actions of each kind happened in the window. */
export async function getReviewPipeline(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<ReviewPipeline> {
  const groups = await prisma.reviewEvent.groupBy({
    by: ["action"],
    where: {
      contentItem: { workspaceId },
      createdAt: { gte: bounds.start, lte: bounds.end },
    },
    _count: { _all: true },
  });

  const byAction: Record<ReviewAction, number> = { submitted: 0, approved: 0, changes_requested: 0 };
  for (const g of groups) byAction[g.action as ReviewAction] = g._count._all;

  return {
    submitted: byAction.submitted,
    approved: byAction.approved,
    changesRequested: byAction.changes_requested,
  };
}

export type ApprovalTurnaround = {
  averageHours: number | null;
  sampleSize: number;
};

/**
 * Average time from a "submitted" review event to the next review
 * decision (approved or changes_requested) on the same content item,
 * for submissions that happened within the window. Pairs are found by
 * walking every review event for this workspace's content chronologically
 * — there's no separate "review cycle" table to query directly.
 */
export async function getApprovalTurnaround(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<ApprovalTurnaround> {
  const events = await prisma.reviewEvent.findMany({
    where: { contentItem: { workspaceId } },
    orderBy: [{ contentItemId: "asc" }, { createdAt: "asc" }],
    select: { contentItemId: true, action: true, createdAt: true },
  });

  const durationsMs: number[] = [];
  let pendingSubmittedAt: Date | null = null;
  let pendingContentItemId: string | null = null;

  for (const event of events) {
    if (event.contentItemId !== pendingContentItemId) {
      pendingSubmittedAt = null;
      pendingContentItemId = event.contentItemId;
    }
    if (event.action === "submitted") {
      pendingSubmittedAt = event.createdAt;
    } else if (pendingSubmittedAt) {
      if (pendingSubmittedAt >= bounds.start && pendingSubmittedAt <= bounds.end) {
        durationsMs.push(event.createdAt.getTime() - pendingSubmittedAt.getTime());
      }
      pendingSubmittedAt = null;
    }
  }

  if (durationsMs.length === 0) return { averageHours: null, sampleSize: 0 };
  const averageMs = durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length;
  return { averageHours: averageMs / (60 * 60 * 1000), sampleSize: durationsMs.length };
}

export type ReviewActivityEntry = {
  id: string;
  actorName: string;
  action: ReviewAction;
  contentTitle: string | null;
  timestamp: string;
};

/** The most recent review decisions/submissions in the window, newest first. */
export async function getReviewActivity(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<ReviewActivityEntry[]> {
  const rows = await prisma.reviewEvent.findMany({
    where: {
      contentItem: { workspaceId },
      createdAt: { gte: bounds.start, lte: bounds.end },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      action: true,
      byName: true,
      createdAt: true,
      contentItem: { select: { title: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    actorName: row.byName,
    action: row.action as ReviewAction,
    contentTitle: row.contentItem?.title ?? null,
    timestamp: formatRelativeTime(row.createdAt),
  }));
}

export type TeamContributionEntry = {
  userId: string;
  name: string;
  initials: string;
  actionCount: number;
};

/**
 * Actions taken per team member in the window (comments, submissions,
 * approvals, calendar changes — anything AuditLog records), ranked by
 * volume. Deliberately keyed off AuditLog.actorId rather than the
 * free-text authorName/byName fields on ContentItem/ReviewEvent/
 * ContentComment: those are plain strings with no FK to User (e.g. a
 * seeded item's authorName "Krisztián M." doesn't string-match the
 * user's real name "Krisztián Mocanu"), so counting by them would
 * silently undercount real contributors. AuditLog.actorId is always the
 * signed-in user's real id, so this is the only reliable source today.
 */
export async function getTeamContribution(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<TeamContributionEntry[]> {
  const [actionGroups, memberships] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ["actorId"],
      where: { workspaceId, createdAt: { gte: bounds.start, lte: bounds.end } },
      _count: { _all: true },
    }),
    prisma.workspaceMembership.findMany({
      where: { workspaceId },
      select: { userId: true, user: { select: { name: true, initials: true } } },
    }),
  ]);

  const memberById = new Map(memberships.map((m) => [m.userId, m.user]));

  return actionGroups
    .map((group) => {
      const user = memberById.get(group.actorId);
      return {
        userId: group.actorId,
        name: user?.name ?? "Former member",
        initials: user?.initials ?? "?",
        actionCount: group._count._all,
      };
    })
    .sort((a, b) => b.actionCount - a.actionCount);
}

export type WorkspaceGrowth = {
  totalMembers: number;
  newMembers: number;
};

/** Team size today, and how many of those joined within the window. */
export async function getWorkspaceGrowth(
  workspaceId: string,
  bounds: DateRangeBounds
): Promise<WorkspaceGrowth> {
  const [totalMembers, newMembers] = await Promise.all([
    prisma.workspaceMembership.count({ where: { workspaceId } }),
    prisma.workspaceMembership.count({
      where: { workspaceId, createdAt: { gte: bounds.start, lte: bounds.end } },
    }),
  ]);
  return { totalMembers, newMembers };
}

export type WorkspaceAnalytics = {
  range: AnalyticsRange;
  rangeLabel: string;
  statusSummary: ContentStatusSummary;
  contentByStatus: CountBreakdown<ContentStatus>;
  contentByPlatform: CountBreakdown<Platform>;
  contentByTag: CountBreakdown<string>;
  postingFrequency: ChartBucket[];
  calendarActivity: PeriodCount;
  reviewPipeline: ReviewPipeline;
  approvalTurnaround: ApprovalTurnaround;
  reviewActivity: ReviewActivityEntry[];
  teamContribution: TeamContributionEntry[];
  workspaceGrowth: WorkspaceGrowth;
};

/**
 * Single entry point the Analytics page uses, running every independent
 * metric query in parallel. Each metric above is also independently
 * exported and importable on its own — e.g. a future Dashboard widget or
 * AI summary feature can call just getReviewPipeline() without paying for
 * everything else here. Wrapped in cache() for per-request dedup, not a
 * persistent cross-request cache: these numbers should reflect the
 * latest content/review/calendar activity, not a stale snapshot.
 */
export const getWorkspaceAnalytics = cache(
  async (workspaceId: string, range: AnalyticsRange): Promise<WorkspaceAnalytics> => {
    const bounds = getRangeBounds(range);

    const [
      statusSummary,
      contentByStatus,
      contentByPlatform,
      contentByTag,
      postingFrequency,
      calendarActivity,
      reviewPipeline,
      approvalTurnaround,
      reviewActivity,
      teamContribution,
      workspaceGrowth,
    ] = await Promise.all([
      getContentStatusSummary(workspaceId, bounds),
      getContentByStatus(workspaceId, bounds),
      getContentByPlatform(workspaceId, bounds),
      getContentByTag(workspaceId, bounds),
      getPostingFrequency(workspaceId, range, bounds),
      getCalendarActivity(workspaceId, bounds),
      getReviewPipeline(workspaceId, bounds),
      getApprovalTurnaround(workspaceId, bounds),
      getReviewActivity(workspaceId, bounds),
      getTeamContribution(workspaceId, bounds),
      getWorkspaceGrowth(workspaceId, bounds),
    ]);

    return {
      range,
      rangeLabel: ANALYTICS_RANGES.find((r) => r.value === range)?.label ?? "",
      statusSummary,
      contentByStatus,
      contentByPlatform,
      contentByTag,
      postingFrequency,
      calendarActivity,
      reviewPipeline,
      approvalTurnaround,
      reviewActivity,
      teamContribution,
      workspaceGrowth,
    };
  }
);
