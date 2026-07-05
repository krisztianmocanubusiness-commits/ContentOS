"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { AssetStatus, AuditAction } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { getAssetDetail, type AssetDetail } from "@/lib/asset-data";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

/**
 * Not a mutation — a Server Action used as an on-demand read so the
 * asset grid (AssetRow, no per-row "used in" list to avoid N+1) doesn't
 * need to over-fetch every asset's full content-usage list just to
 * support the detail dialog for whichever one card gets clicked.
 */
export async function getAssetDetailAction(workspaceSlug: string, assetId: string): Promise<AssetDetail | null> {
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  return getAssetDetail(workspace.id, assetId);
}

const MAX_NAME_LENGTH = 200;
const MAX_FOLDER_LENGTH = 100;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 20;

type AssetSummary = { id: string; name: string; folder: string; tags: string[] };

async function findOwnedAsset(workspaceId: string, assetId: string) {
  return prisma.asset.findFirst({ where: { id: assetId, workspaceId } });
}

export async function renameAssetAction(
  workspaceSlug: string,
  assetId: string,
  name: string
): Promise<ActionResult<AssetSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return { ok: false, error: "Your role can't manage assets.", code: "forbidden" };
  }

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Give the asset a name.", code: "invalid" };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`, code: "invalid" };
  }

  const existing = await findOwnedAsset(workspace.id, assetId);
  if (!existing) return { ok: false, error: "Asset not found.", code: "not_found" };

  if (existing.name === trimmed) {
    return { ok: true, data: { id: existing.id, name: existing.name, folder: existing.folder, tags: existing.tags } };
  }

  const [updated] = await prisma.$transaction([
    prisma.asset.update({ where: { id: assetId }, data: { name: trimmed } }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        assetId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.AssetRenamed,
        metadata: { from: existing.name, to: trimmed },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/assets`);
  return { ok: true, data: { id: updated.id, name: updated.name, folder: updated.folder, tags: updated.tags } };
}

export async function moveAssetAction(
  workspaceSlug: string,
  assetId: string,
  folder: string
): Promise<ActionResult<AssetSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return { ok: false, error: "Your role can't manage assets.", code: "forbidden" };
  }

  const trimmed = folder.trim() || "Uncategorized";
  if (trimmed.length > MAX_FOLDER_LENGTH) {
    return { ok: false, error: `Folder must be ${MAX_FOLDER_LENGTH} characters or fewer.`, code: "invalid" };
  }

  const existing = await findOwnedAsset(workspace.id, assetId);
  if (!existing) return { ok: false, error: "Asset not found.", code: "not_found" };

  if (existing.folder === trimmed) {
    return { ok: true, data: { id: existing.id, name: existing.name, folder: existing.folder, tags: existing.tags } };
  }

  const [updated] = await prisma.$transaction([
    prisma.asset.update({ where: { id: assetId }, data: { folder: trimmed } }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        assetId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.AssetMoved,
        metadata: { from: existing.folder, to: trimmed },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/assets`);
  return { ok: true, data: { id: updated.id, name: updated.name, folder: updated.folder, tags: updated.tags } };
}

export async function updateAssetTagsAction(
  workspaceSlug: string,
  assetId: string,
  tags: string[]
): Promise<ActionResult<AssetSummary>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return { ok: false, error: "Your role can't manage assets.", code: "forbidden" };
  }

  const cleaned = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH)
    )
  ).slice(0, MAX_TAGS);

  const existing = await findOwnedAsset(workspace.id, assetId);
  if (!existing) return { ok: false, error: "Asset not found.", code: "not_found" };

  const [updated] = await prisma.$transaction([
    prisma.asset.update({ where: { id: assetId }, data: { tags: cleaned } }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        assetId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.AssetTagsChanged,
        metadata: { from: existing.tags, to: cleaned },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/assets`);
  return { ok: true, data: { id: updated.id, name: updated.name, folder: updated.folder, tags: updated.tags } };
}

export async function deleteAssetAction(
  workspaceSlug: string,
  assetId: string
): Promise<ActionResult<{ id: string; name: string }>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return { ok: false, error: "Your role can't manage assets.", code: "forbidden" };
  }

  const existing = await findOwnedAsset(workspace.id, assetId);
  if (!existing) return { ok: false, error: "Asset not found.", code: "not_found" };
  if (existing.status === AssetStatus.Deleted) {
    return { ok: false, error: "Asset is already deleted.", code: "invalid" };
  }

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: assetId },
      data: { status: AssetStatus.Deleted, deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        assetId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.AssetDeleted,
        metadata: { name: existing.name, folder: existing.folder, type: existing.type },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/assets`);
  return { ok: true, data: { id: existing.id, name: existing.name } };
}

export async function restoreAssetAction(
  workspaceSlug: string,
  assetId: string
): Promise<ActionResult<{ id: string; name: string }>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return { ok: false, error: "Your role can't manage assets.", code: "forbidden" };
  }

  const existing = await prisma.asset.findFirst({ where: { id: assetId, workspaceId: workspace.id } });
  if (!existing) return { ok: false, error: "Asset not found.", code: "not_found" };
  if (existing.status === AssetStatus.Active) {
    return { ok: false, error: "Asset isn't deleted.", code: "invalid" };
  }

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: assetId },
      data: { status: AssetStatus.Active, deletedAt: null },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        assetId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.AssetRestored,
        metadata: { name: existing.name, folder: existing.folder, type: existing.type },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/assets`);
  return { ok: true, data: { id: existing.id, name: existing.name } };
}
