import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  ConversationStatus as DbConversationStatus,
  InboxItemType as DbInboxItemType,
  Platform as DbPlatform,
} from "@/generated/prisma/enums";
import { formatRelativeTime } from "@/lib/format";
import type { ConversationStatus, InboxItemType, MessageSender } from "@/lib/inbox-types";
import type { Platform } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

/** Default page size for the cursor-paginated conversation list. */
export const CONVERSATIONS_PAGE_SIZE = 20;

export type ConversationFilters = {
  search?: string;
  type?: InboxItemType;
  platform?: Platform;
  status?: ConversationStatus;
  /** Defaults to false (the inbox shows non-archived conversations unless asked otherwise). */
  archived?: boolean;
  /** A real membership id, or the sentinel "unassigned" for assignedToMembershipId: null. */
  assignedToMembershipId?: string;
  unreadOnly?: boolean;
};

export type AssignedMember = { membershipId: string; name: string; initials: string };

export type ConversationSummary = {
  id: string;
  platform: Platform;
  type: InboxItemType;
  contactName: string;
  contactHandle: string;
  contactInitials: string;
  status: ConversationStatus;
  unread: boolean;
  archived: boolean;
  lastMessageAt: string;
  lastMessageBody: string | null;
  assignedTo: AssignedMember | null;
};

/** Every filter here is applied in SQL — the list is never fetched whole and filtered in memory. */
function buildConversationWhere(
  workspaceId: string,
  filters: Omit<ConversationFilters, "unreadOnly">
): Prisma.ConversationWhereInput {
  return {
    workspaceId,
    archived: filters.archived ?? false,
    ...(filters.type ? { type: filters.type as DbInboxItemType } : {}),
    ...(filters.platform ? { platform: filters.platform as DbPlatform } : {}),
    ...(filters.status ? { status: filters.status as DbConversationStatus } : {}),
    ...(filters.assignedToMembershipId === "unassigned"
      ? { assignedToMembershipId: null }
      : filters.assignedToMembershipId
        ? { assignedToMembershipId: filters.assignedToMembershipId }
        : {}),
    ...(filters.search
      ? {
          OR: [
            { contactName: { contains: filters.search, mode: "insensitive" as const } },
            { contactHandle: { contains: filters.search, mode: "insensitive" as const } },
            { messages: { some: { body: { contains: filters.search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
}

function toAssignedMember(row: {
  id: string;
  user: { name: string; initials: string };
} | null): AssignedMember | null {
  if (!row) return null;
  return { membershipId: row.id, name: row.user.name, initials: row.user.initials };
}

function toConversationSummary(row: {
  id: string;
  platform: string;
  type: string;
  contactName: string;
  contactHandle: string;
  contactInitials: string;
  status: string;
  unread: boolean;
  archived: boolean;
  updatedAt: Date;
  messages: { body: string }[];
  assignedTo: { id: string; user: { name: string; initials: string } } | null;
}): ConversationSummary {
  return {
    id: row.id,
    platform: row.platform as Platform,
    type: row.type as InboxItemType,
    contactName: row.contactName,
    contactHandle: row.contactHandle,
    contactInitials: row.contactInitials,
    status: row.status as ConversationStatus,
    unread: row.unread,
    archived: row.archived,
    lastMessageAt: formatRelativeTime(row.updatedAt),
    lastMessageBody: row.messages[0]?.body ?? null,
    assignedTo: toAssignedMember(row.assignedTo),
  };
}

/**
 * Cursor-paginated conversation list, ordered newest-activity-first.
 * `updatedAt` alone isn't a stable sort key (ties on the same millisecond
 * are possible with seeded/bulk data), so `id` breaks ties — the same
 * compound cursor a caller passes back in is exactly what orderBy uses,
 * so pages can't skip or repeat rows across requests.
 */
export async function getWorkspaceConversations(
  workspaceId: string,
  filters: ConversationFilters = {},
  cursor?: string,
  limit: number = CONVERSATIONS_PAGE_SIZE
): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
  const where: Prisma.ConversationWhereInput = {
    ...buildConversationWhere(workspaceId, filters),
    ...(filters.unreadOnly ? { unread: true } : {}),
  };

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      platform: true,
      type: true,
      contactName: true,
      contactHandle: true,
      contactInitials: true,
      status: true,
      unread: true,
      archived: true,
      updatedAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
      assignedTo: { select: { id: true, user: { select: { name: true, initials: true } } } },
    },
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toConversationSummary);
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

/**
 * Total/unread counts for the current filter set, independent of
 * pagination — the list header ("N unread · M total") needs workspace-wide
 * numbers, not just what happens to be on the current page.
 */
export async function getWorkspaceConversationCounts(
  workspaceId: string,
  filters: Omit<ConversationFilters, "unreadOnly"> = {}
): Promise<{ total: number; unread: number }> {
  const where = buildConversationWhere(workspaceId, filters);
  const [total, unread] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.count({ where: { ...where, unread: true } }),
  ]);
  return { total, unread };
}

export type ThreadMessage = { id: string; from: MessageSender; body: string; timestamp: string };
export type ConversationNoteDTO = { id: string; authorName: string; body: string; timestamp: string };

export type ConversationDetail = Omit<ConversationSummary, "lastMessageBody"> & {
  contactHandle: string;
  messages: ThreadMessage[];
  notes: ConversationNoteDTO[];
};

/** Full thread + internal notes for the selected conversation, scoped to the workspace. */
export async function getConversationDetail(
  workspaceId: string,
  conversationId: string
): Promise<ConversationDetail | null> {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" } },
      assignedTo: { select: { id: true, user: { select: { name: true, initials: true } } } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    platform: row.platform as Platform,
    type: row.type as InboxItemType,
    contactName: row.contactName,
    contactHandle: row.contactHandle,
    contactInitials: row.contactInitials,
    status: row.status as ConversationStatus,
    unread: row.unread,
    archived: row.archived,
    lastMessageAt: formatRelativeTime(row.updatedAt),
    assignedTo: toAssignedMember(row.assignedTo),
    messages: row.messages.map((m) => ({
      id: m.id,
      from: m.from as MessageSender,
      body: m.body,
      timestamp: formatRelativeTime(m.createdAt),
    })),
    notes: row.notes.map((n) => ({
      id: n.id,
      authorName: n.authorName,
      body: n.body,
      timestamp: formatRelativeTime(n.createdAt),
    })),
  };
}

/** Active members a conversation can be assigned to (Invited members can't yet act on anything — see TECH_DEBT.md). */
export async function getAssignableMembers(workspaceId: string): Promise<AssignedMember[]> {
  const rows = await prisma.workspaceMembership.findMany({
    where: { workspaceId, status: "Active" },
    orderBy: { createdAt: "asc" },
    select: { id: true, user: { select: { name: true, initials: true } } },
  });
  return rows.map((row) => ({ membershipId: row.id, name: row.user.name, initials: row.user.initials }));
}
