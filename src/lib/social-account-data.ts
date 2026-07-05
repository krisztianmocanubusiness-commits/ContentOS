import "server-only";

import { ContentStatus as DbContentStatus } from "@/generated/prisma/enums";
import { formatMonthYear, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Platform } from "@/lib/mock-data";
import type { ConnectionHealth, SocialStatus } from "@/lib/social-account-types";

const EXPIRING_SOON_DAYS = 7;

/**
 * Derived, not stored: Healthy/ExpiringSoon only apply while Connected
 * (a real token exists and hasn't lapsed yet); NeedsReauth always reads
 * as Expired regardless of tokenExpiresAt, since that status already
 * means the token is known-bad.
 */
export function getConnectionHealth(
  status: SocialStatus,
  tokenExpiresAt: Date | null,
  now: Date = new Date()
): ConnectionHealth {
  if (status === "NotConnected") return "Disconnected";
  if (status === "NeedsReauth") return "Expired";
  if (!tokenExpiresAt) return "Healthy";
  const daysLeft = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 0) return "Expired";
  if (daysLeft <= EXPIRING_SOON_DAYS) return "ExpiringSoon";
  return "Healthy";
}

export type SocialAccountRow = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  followersLabel: string;
  status: SocialStatus;
  scopes: string[];
  health: ConnectionHealth;
  connectedSinceLabel: string | null;
  lastSyncedLabel: string | null;
  tokenExpiresAtLabel: string | null;
};

function toSocialAccountRow(row: {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  followersLabel: string;
  status: string;
  scopes: string[];
  tokenExpiresAt: Date | null;
  connectedSince: Date | null;
  lastSyncedAt: Date | null;
}): SocialAccountRow {
  const status = row.status as SocialStatus;
  return {
    id: row.id,
    platform: row.platform as Platform,
    handle: row.handle,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    followersLabel: row.followersLabel,
    status,
    scopes: row.scopes,
    health: getConnectionHealth(status, row.tokenExpiresAt),
    connectedSinceLabel: row.connectedSince ? formatMonthYear(row.connectedSince) : null,
    lastSyncedLabel: row.lastSyncedAt ? formatRelativeTime(row.lastSyncedAt) : null,
    tokenExpiresAtLabel: row.tokenExpiresAt ? formatMonthYear(row.tokenExpiresAt) : null,
  };
}

/** A workspace's connected channels, in the order they were added. */
export async function getWorkspaceSocialAccounts(workspaceId: string): Promise<SocialAccountRow[]> {
  const rows = await prisma.socialAccount.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toSocialAccountRow);
}

const CONTENT_STATUS_DB_TO_UI: Record<string, string> = {
  Draft: "Draft",
  Scheduled: "Scheduled",
  Published: "Published",
  NeedsReview: "Needs Review",
};

export type SocialAccountDetail = SocialAccountRow & {
  recentPosts: { id: string; title: string; status: string }[];
};

export async function getSocialAccountDetail(
  workspaceId: string,
  accountId: string
): Promise<SocialAccountDetail | null> {
  const row = await prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId } });
  if (!row) return null;

  const recentPosts = await prisma.contentItem.findMany({
    where: {
      workspaceId,
      platform: row.platform,
      status: { in: [DbContentStatus.Published, DbContentStatus.Scheduled] },
    },
    orderBy: { scheduledAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true },
  });

  return {
    ...toSocialAccountRow(row),
    recentPosts: recentPosts.map((post) => ({
      id: post.id,
      title: post.title,
      status: CONTENT_STATUS_DB_TO_UI[post.status] ?? post.status,
    })),
  };
}
