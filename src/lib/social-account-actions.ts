"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { AuditAction, Platform as DbPlatform, SocialStatus as DbSocialStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSocialAccountDetail, type SocialAccountDetail } from "@/lib/social-account-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const MAX_HANDLE_LENGTH = 100;
const MAX_NAME_LENGTH = 100;
const TOKEN_LIFETIME_DAYS = 60;

/** Simulated OAuth — see TECH_DEBT.md. Uniform across platforms; real scope sets would vary per provider. */
const SIMULATED_SCOPES = ["read_profile", "read_posts", "publish_posts", "read_insights"];

function tokenExpiryFromNow(): Date {
  return new Date(Date.now() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
}

type AccountSummary = { id: string; platform: string; handle: string; displayName: string; status: string };

function toSummary(row: { id: string; platform: string; handle: string; displayName: string; status: string }): AccountSummary {
  return { id: row.id, platform: row.platform, handle: row.handle, displayName: row.displayName, status: row.status };
}

async function findOwnedAccount(workspaceId: string, accountId: string) {
  return prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId } });
}

export async function connectAccountAction(
  workspaceSlug: string,
  input: { platform: string; handle: string; displayName?: string }
): Promise<ActionResult<AccountSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageSocialAccounts")) {
    return { ok: false, error: "Your role can't connect social accounts.", code: "forbidden" };
  }

  const handle = input.handle.trim();
  if (!handle) return { ok: false, error: "Enter a handle.", code: "invalid" };
  if (handle.length > MAX_HANDLE_LENGTH) {
    return { ok: false, error: `Handle must be ${MAX_HANDLE_LENGTH} characters or fewer.`, code: "invalid" };
  }
  if (!Object.values(DbPlatform).includes(input.platform as DbPlatform)) {
    return { ok: false, error: "Choose a valid platform.", code: "invalid" };
  }
  const displayName = (input.displayName?.trim() || handle).slice(0, MAX_NAME_LENGTH);

  const id = randomUUID();
  const now = new Date();
  const [account] = await prisma.$transaction([
    prisma.socialAccount.create({
      data: {
        id,
        workspaceId: workspace.id,
        platform: input.platform as DbPlatform,
        handle,
        displayName,
        followersLabel: "0",
        status: DbSocialStatus.Connected,
        scopes: SIMULATED_SCOPES,
        tokenExpiresAt: tokenExpiryFromNow(),
        connectedSince: now,
        lastSyncedAt: now,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        socialAccountId: id,
        actorId: userId,
        actorName: userName,
        action: AuditAction.SocialAccountConnected,
        metadata: { platform: input.platform, handle },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/social-accounts`);
  return { ok: true, data: toSummary(account) };
}

export async function disconnectAccountAction(
  workspaceSlug: string,
  accountId: string
): Promise<ActionResult<AccountSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageSocialAccounts")) {
    return { ok: false, error: "Your role can't manage social accounts.", code: "forbidden" };
  }

  const existing = await findOwnedAccount(workspace.id, accountId);
  if (!existing) return { ok: false, error: "Account not found.", code: "not_found" };
  if (existing.status === DbSocialStatus.NotConnected) {
    return { ok: false, error: "Account is already disconnected.", code: "invalid" };
  }

  const [account] = await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: DbSocialStatus.NotConnected, scopes: [], tokenExpiresAt: null, connectedSince: null, lastSyncedAt: null },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        socialAccountId: accountId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.SocialAccountDisconnected,
        metadata: { platform: existing.platform, handle: existing.handle },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/social-accounts`);
  return { ok: true, data: toSummary(account) };
}

export async function reconnectAccountAction(
  workspaceSlug: string,
  accountId: string
): Promise<ActionResult<AccountSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageSocialAccounts")) {
    return { ok: false, error: "Your role can't manage social accounts.", code: "forbidden" };
  }

  const existing = await findOwnedAccount(workspace.id, accountId);
  if (!existing) return { ok: false, error: "Account not found.", code: "not_found" };
  if (existing.status === DbSocialStatus.Connected) {
    return { ok: false, error: "Account is already connected.", code: "invalid" };
  }

  const [account] = await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        status: DbSocialStatus.Connected,
        scopes: SIMULATED_SCOPES,
        tokenExpiresAt: tokenExpiryFromNow(),
        // A NeedsReauth account keeps its original connection date; a
        // fully NotConnected one is treated as a fresh connection.
        connectedSince: existing.connectedSince ?? new Date(),
        lastSyncedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        socialAccountId: accountId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.SocialAccountReconnected,
        metadata: { platform: existing.platform, handle: existing.handle, from: existing.status },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/social-accounts`);
  return { ok: true, data: toSummary(account) };
}

export async function renameAccountAction(
  workspaceSlug: string,
  accountId: string,
  displayName: string
): Promise<ActionResult<AccountSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageSocialAccounts")) {
    return { ok: false, error: "Your role can't manage social accounts.", code: "forbidden" };
  }

  const trimmed = displayName.trim();
  if (!trimmed) return { ok: false, error: "Give the account a name.", code: "invalid" };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`, code: "invalid" };
  }

  const existing = await findOwnedAccount(workspace.id, accountId);
  if (!existing) return { ok: false, error: "Account not found.", code: "not_found" };

  if (existing.displayName === trimmed) {
    return { ok: true, data: toSummary(existing) };
  }

  const [account] = await prisma.$transaction([
    prisma.socialAccount.update({ where: { id: accountId }, data: { displayName: trimmed } }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        socialAccountId: accountId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.SocialAccountRenamed,
        metadata: { from: existing.displayName, to: trimmed },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/social-accounts`);
  return { ok: true, data: toSummary(account) };
}

/**
 * Simulates an external event (the platform revoking or invalidating the
 * token) rather than a user-initiated disconnect — the fix is Reconnect,
 * not Connect, and the distinction is exactly what a real webhook-driven
 * health check would produce. Demo/testing affordance since there's no
 * real OAuth provider to actually revoke anything (see TECH_DEBT.md).
 */
export async function simulateConnectionIssueAction(
  workspaceSlug: string,
  accountId: string
): Promise<ActionResult<AccountSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageSocialAccounts")) {
    return { ok: false, error: "Your role can't manage social accounts.", code: "forbidden" };
  }

  const existing = await findOwnedAccount(workspace.id, accountId);
  if (!existing) return { ok: false, error: "Account not found.", code: "not_found" };
  if (existing.status !== DbSocialStatus.Connected) {
    return { ok: false, error: "Only a connected account can need reauthorization.", code: "invalid" };
  }

  const [account] = await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: DbSocialStatus.NeedsReauth, tokenExpiresAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        socialAccountId: accountId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.SocialAccountStatusChanged,
        metadata: { platform: existing.platform, handle: existing.handle, from: "Connected", to: "NeedsReauth" },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/social-accounts`);
  return { ok: true, data: toSummary(account) };
}

/** Not a mutation — an on-demand read (same pattern as getAssetDetailAction) so the list doesn't need to over-fetch every account's recent posts. */
export async function getAccountDetailAction(
  workspaceSlug: string,
  accountId: string
): Promise<SocialAccountDetail | null> {
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  return getSocialAccountDetail(workspace.id, accountId);
}
