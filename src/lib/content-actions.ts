"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { AuditAction, ContentStatus as DbContentStatus } from "@/generated/prisma/enums";
import type { Prisma, ReviewEvent as PrismaReviewEvent } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { formatRelativeTime } from "@/lib/format";
import type { ContentComment, ContentStatus, ReviewEvent } from "@/lib/mock-data";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const MAX_COMMENT_LENGTH = 2000;
const MAX_REASON_LENGTH = 500;

const CONFLICT_MESSAGE =
  "This content was updated by someone else in the meantime. Refresh to see the latest.";

/**
 * Explicit return type for the three review-transition transactions
 * below. Without it, TypeScript's inference through prisma.$transaction's
 * generic signature widens `reviewEvent` to possibly-undefined across
 * both branches instead of keeping a clean discriminated union on
 * `transition` — annotating the callback keeps the narrowing exact.
 */
type TransitionOutcome =
  | { transition: "conflict" }
  | { transition: "not_found" }
  | { transition: "ok"; reviewEvent: PrismaReviewEvent };

/**
 * Flips a content item's status inside an already-open transaction, but
 * only if it's still in `fromStatus` — an atomic compare-and-swap so two
 * reviewers acting on the same stale view can't silently clobber each
 * other. Distinguishes "someone already moved it" (conflict) from "it
 * never belonged to this workspace" (not_found) so callers can react
 * with the right message.
 */
async function transitionStatus(
  tx: Prisma.TransactionClient,
  params: {
    workspaceId: string;
    contentItemId: string;
    fromStatus: DbContentStatus;
    toStatus: DbContentStatus;
  }
): Promise<"ok" | "conflict" | "not_found"> {
  const updated = await tx.contentItem.updateMany({
    where: {
      id: params.contentItemId,
      workspaceId: params.workspaceId,
      status: params.fromStatus,
    },
    data: { status: params.toStatus },
  });
  if (updated.count === 1) return "ok";

  const exists = await tx.contentItem.findFirst({
    where: { id: params.contentItemId, workspaceId: params.workspaceId },
    select: { id: true },
  });
  return exists ? "conflict" : "not_found";
}

function toReviewEventDTO(event: {
  id: string;
  action: string;
  byName: string;
  byInitials: string;
  createdAt: Date;
  note: string | null;
}): ReviewEvent {
  return {
    id: event.id,
    action: event.action as ReviewEvent["action"],
    by: event.byName,
    byInitials: event.byInitials,
    timestamp: formatRelativeTime(event.createdAt),
    note: event.note ?? undefined,
  };
}

export async function addCommentAction(
  workspaceSlug: string,
  contentItemId: string,
  body: string
): Promise<ActionResult<ContentComment>> {
  const { workspace, userId, userName, userInitials } = await requireWorkspaceAccess(workspaceSlug);

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Comment can't be empty.", code: "invalid" };
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false,
      error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`,
      code: "invalid",
    };
  }

  const item = await prisma.contentItem.findFirst({
    where: { id: contentItemId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!item) {
    return { ok: false, error: "Content not found.", code: "not_found" };
  }

  const commentId = randomUUID();
  const [comment] = await prisma.$transaction([
    prisma.contentComment.create({
      data: {
        id: commentId,
        contentItemId,
        author: userName,
        authorInitials: userInitials,
        body: trimmed,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        contentItemId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ContentCommented,
        metadata: { commentId },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/content`);

  return {
    ok: true,
    data: {
      id: comment.id,
      author: comment.author,
      authorInitials: comment.authorInitials,
      body: comment.body,
      timestamp: formatRelativeTime(comment.createdAt),
    },
  };
}

export async function submitForReviewAction(
  workspaceSlug: string,
  contentItemId: string
): Promise<ActionResult<{ status: ContentStatus; reviewEvent: ReviewEvent }>> {
  const { workspace, userId, userName, userInitials, role } =
    await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return { ok: false, error: "Your role can't submit content for review.", code: "forbidden" };
  }

  const outcome = await prisma.$transaction(async (tx): Promise<TransitionOutcome> => {
    const transition = await transitionStatus(tx, {
      workspaceId: workspace.id,
      contentItemId,
      fromStatus: DbContentStatus.Draft,
      toStatus: DbContentStatus.NeedsReview,
    });
    if (transition === "conflict") return { transition } as const;
    if (transition === "not_found") return { transition } as const;

    const reviewEvent = await tx.reviewEvent.create({
      data: {
        id: randomUUID(),
        contentItemId,
        action: "submitted",
        byName: userName,
        byInitials: userInitials,
      },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        contentItemId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ContentSubmitted,
      },
    });
    return { transition, reviewEvent } as const;
  });

  if (outcome.transition === "not_found") {
    return { ok: false, error: "Content not found.", code: "not_found" };
  }
  if (outcome.transition === "conflict") {
    return { ok: false, error: CONFLICT_MESSAGE, code: "conflict" };
  }

  revalidatePath(`/w/${workspaceSlug}/content`);

  return {
    ok: true,
    data: { status: "Needs Review", reviewEvent: toReviewEventDTO(outcome.reviewEvent) },
  };
}

export async function approveContentAction(
  workspaceSlug: string,
  contentItemId: string
): Promise<ActionResult<{ status: ContentStatus; reviewEvent: ReviewEvent }>> {
  const { workspace, userId, userName, userInitials, role } =
    await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "approveContent")) {
    return { ok: false, error: "Your role can't approve content.", code: "forbidden" };
  }

  const outcome = await prisma.$transaction(async (tx): Promise<TransitionOutcome> => {
    const transition = await transitionStatus(tx, {
      workspaceId: workspace.id,
      contentItemId,
      fromStatus: DbContentStatus.NeedsReview,
      toStatus: DbContentStatus.Scheduled,
    });
    if (transition === "conflict") return { transition } as const;
    if (transition === "not_found") return { transition } as const;

    const reviewEvent = await tx.reviewEvent.create({
      data: {
        id: randomUUID(),
        contentItemId,
        action: "approved",
        byName: userName,
        byInitials: userInitials,
      },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        contentItemId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ContentApproved,
      },
    });
    return { transition, reviewEvent } as const;
  });

  if (outcome.transition === "not_found") {
    return { ok: false, error: "Content not found.", code: "not_found" };
  }
  if (outcome.transition === "conflict") {
    return { ok: false, error: CONFLICT_MESSAGE, code: "conflict" };
  }

  revalidatePath(`/w/${workspaceSlug}/content`);

  return {
    ok: true,
    data: { status: "Scheduled", reviewEvent: toReviewEventDTO(outcome.reviewEvent) },
  };
}

export async function requestChangesAction(
  workspaceSlug: string,
  contentItemId: string,
  reason: string
): Promise<ActionResult<{ status: ContentStatus; reviewEvent: ReviewEvent }>> {
  const { workspace, userId, userName, userInitials, role } =
    await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "approveContent")) {
    return { ok: false, error: "Your role can't request changes.", code: "forbidden" };
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { ok: false, error: "Tell the author what needs to change.", code: "invalid" };
  }
  if (trimmedReason.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      error: `Reason must be ${MAX_REASON_LENGTH} characters or fewer.`,
      code: "invalid",
    };
  }

  const outcome = await prisma.$transaction(async (tx): Promise<TransitionOutcome> => {
    const transition = await transitionStatus(tx, {
      workspaceId: workspace.id,
      contentItemId,
      fromStatus: DbContentStatus.NeedsReview,
      toStatus: DbContentStatus.Draft,
    });
    if (transition === "conflict") return { transition } as const;
    if (transition === "not_found") return { transition } as const;

    const reviewEvent = await tx.reviewEvent.create({
      data: {
        id: randomUUID(),
        contentItemId,
        action: "changes_requested",
        byName: userName,
        byInitials: userInitials,
        note: trimmedReason,
      },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        contentItemId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.ContentChangesRequested,
        metadata: { note: trimmedReason },
      },
    });
    return { transition, reviewEvent } as const;
  });

  if (outcome.transition === "not_found") {
    return { ok: false, error: "Content not found.", code: "not_found" };
  }
  if (outcome.transition === "conflict") {
    return { ok: false, error: CONFLICT_MESSAGE, code: "conflict" };
  }

  revalidatePath(`/w/${workspaceSlug}/content`);

  return {
    ok: true,
    data: { status: "Draft", reviewEvent: toReviewEventDTO(outcome.reviewEvent) },
  };
}
