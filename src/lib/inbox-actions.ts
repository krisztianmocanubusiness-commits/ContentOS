"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  AuditAction,
  ConversationStatus as DbConversationStatus,
  MessageSender as DbMessageSender,
} from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import {
  getConversationDetail,
  getWorkspaceConversations,
  getWorkspaceConversationCounts,
  type ConversationDetail,
  type ConversationFilters,
  type ConversationSummary,
  type ConversationNoteDTO,
  type ThreadMessage,
} from "@/lib/inbox-data";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const MAX_NOTE_LENGTH = 2000;
const MAX_REPLY_LENGTH = 2000;

type ConversationState = Pick<ConversationSummary, "id" | "unread" | "archived" | "status" | "assignedTo">;

function toState(row: {
  id: string;
  unread: boolean;
  archived: boolean;
  status: string;
  assignedTo: { id: string; user: { name: string; initials: string } } | null;
}): ConversationState {
  return {
    id: row.id,
    unread: row.unread,
    archived: row.archived,
    status: row.status as ConversationState["status"],
    assignedTo: row.assignedTo
      ? { membershipId: row.assignedTo.id, name: row.assignedTo.user.name, initials: row.assignedTo.user.initials }
      : null,
  };
}

const ASSIGNED_TO_INCLUDE = {
  assignedTo: { select: { id: true, user: { select: { name: true, initials: true } } } },
} as const;

async function findOwnedConversation(workspaceId: string, conversationId: string) {
  return prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
}

function forbidden(): ActionResult<never> {
  return { ok: false, error: "Your role can't manage the inbox.", code: "forbidden" };
}

/** Not a mutation — the client-driven read behind search/filter/pagination, so the initial page load can stay a small first page. */
export async function getConversationsAction(
  workspaceSlug: string,
  filters: ConversationFilters,
  cursor?: string
) {
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  const [page, counts] = await Promise.all([
    getWorkspaceConversations(workspace.id, filters, cursor),
    getWorkspaceConversationCounts(workspace.id, filters),
  ]);
  return { ...page, counts };
}

/** Not a mutation — lazy-loads the full thread + notes only once a conversation is opened. */
export async function getConversationDetailAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ConversationDetail | null> {
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  return getConversationDetail(workspace.id, conversationId);
}

export async function markConversationReadAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };
  if (!existing.unread) return { ok: true, data: toState({ ...existing, assignedTo: null }) };

  const [row] = await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversationId }, data: { unread: false }, include: ASSIGNED_TO_INCLUDE }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationMarkedRead,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

export async function markConversationUnreadAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };

  const [row] = await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversationId }, data: { unread: true }, include: ASSIGNED_TO_INCLUDE }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationMarkedUnread,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

export async function archiveConversationAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };
  if (existing.archived) return { ok: false, error: "Conversation is already archived.", code: "invalid" };

  const [row] = await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversationId }, data: { archived: true }, include: ASSIGNED_TO_INCLUDE }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationArchived,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

export async function unarchiveConversationAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };
  if (!existing.archived) return { ok: false, error: "Conversation isn't archived.", code: "invalid" };

  const [row] = await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversationId }, data: { archived: false }, include: ASSIGNED_TO_INCLUDE }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationUnarchived,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

export async function resolveConversationAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };
  if (existing.status === DbConversationStatus.Resolved) {
    return { ok: false, error: "Conversation is already resolved.", code: "invalid" };
  }

  const [row] = await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { status: DbConversationStatus.Resolved },
      include: ASSIGNED_TO_INCLUDE,
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationResolved,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

export async function reopenConversationAction(
  workspaceSlug: string,
  conversationId: string
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };
  if (existing.status === DbConversationStatus.Open) {
    return { ok: false, error: "Conversation is already open.", code: "invalid" };
  }

  const [row] = await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { status: DbConversationStatus.Open },
      include: ASSIGNED_TO_INCLUDE,
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationReopened,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

/** `membershipId: null` unassigns. The caller passes membership ids, never user ids — assignment is per-workspace-membership, same as Conversation.assignedToMembershipId. */
export async function assignConversationAction(
  workspaceSlug: string,
  conversationId: string,
  membershipId: string | null
): Promise<ActionResult<ConversationState>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };

  if (membershipId) {
    const assignee = await prisma.workspaceMembership.findFirst({
      where: { id: membershipId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!assignee) return { ok: false, error: "Choose a valid team member.", code: "invalid" };
  }

  const [row] = await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToMembershipId: membershipId },
      include: ASSIGNED_TO_INCLUDE,
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationAssigned,
        metadata: { from: existing.assignedToMembershipId, to: membershipId },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: toState(row) };
}

export async function addConversationNoteAction(
  workspaceSlug: string,
  conversationId: string,
  body: string
): Promise<ActionResult<ConversationNoteDTO>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Write a note first.", code: "invalid" };
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Notes must be ${MAX_NOTE_LENGTH} characters or fewer.`, code: "invalid" };
  }

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };

  const id = randomUUID();
  const [note] = await prisma.$transaction([
    prisma.conversationNote.create({
      data: { id, conversationId, authorId: userId, authorName: userName, body: trimmed },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationNoteAdded,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: { id: note.id, authorName: note.authorName, body: note.body, timestamp: "Just now" } };
}

export async function replyToConversationAction(
  workspaceSlug: string,
  conversationId: string,
  body: string
): Promise<ActionResult<ThreadMessage>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageInbox")) return forbidden();

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Write a reply first.", code: "invalid" };
  if (trimmed.length > MAX_REPLY_LENGTH) {
    return { ok: false, error: `Replies must be ${MAX_REPLY_LENGTH} characters or fewer.`, code: "invalid" };
  }

  const existing = await findOwnedConversation(workspace.id, conversationId);
  if (!existing) return { ok: false, error: "Conversation not found.", code: "not_found" };

  const id = randomUUID();
  const [message] = await prisma.$transaction([
    prisma.inboxMessage.create({
      data: { id, conversationId, from: DbMessageSender.you, body: trimmed },
    }),
    // Bumps updatedAt explicitly so the conversation resurfaces at the top
    // of the newest-activity ordering, same as a real reply would.
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        conversationId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ConversationReplied,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/inbox`);
  return { ok: true, data: { id: message.id, from: "you", body: message.body, timestamp: "Just now" } };
}
