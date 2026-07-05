import "server-only";

import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { AssetType as DbAssetType, AuditAction } from "@/generated/prisma/enums";
import type { AssetType } from "@/lib/asset-types";
import { formatShortDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type AssetStatusFilter = "Active" | "Deleted";

export type AssetRow = {
  id: string;
  name: string;
  type: AssetType;
  folder: string;
  tags: string[];
  byteSize: number;
  mimeType: string;
  hasThumbnail: boolean;
  status: AssetStatusFilter;
  /** Pre-formatted ("Jun 28") — dates cross the server/client boundary as display strings throughout this app, not raw Date objects. */
  dateLabel: string;
  usedInCount: number;
};

export type AssetFilters = {
  search?: string;
  type?: AssetType;
  folder?: string;
  tag?: string;
  status?: AssetStatusFilter;
};

function toAssetRow(row: {
  id: string;
  name: string;
  type: string;
  folder: string;
  tags: string[];
  byteSize: number;
  mimeType: string;
  thumbnailKey: string | null;
  status: string;
  createdAt: Date;
}, usedInCount: number): AssetRow {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AssetType,
    folder: row.folder,
    tags: row.tags,
    byteSize: row.byteSize,
    mimeType: row.mimeType,
    hasThumbnail: row.thumbnailKey !== null,
    status: row.status as AssetStatusFilter,
    dateLabel: formatShortDate(row.createdAt),
    usedInCount,
  };
}

/** A workspace's assets, scoped and filtered in SQL rather than fetch-then-filter. */
export async function getWorkspaceAssets(
  workspaceId: string,
  filters: AssetFilters = {}
): Promise<AssetRow[]> {
  const rows = await prisma.asset.findMany({
    where: {
      workspaceId,
      status: filters.status ?? "Active",
      ...(filters.type ? { type: filters.type as DbAssetType } : {}),
      ...(filters.folder ? { folder: filters.folder } : {}),
      ...(filters.tag ? { tags: { has: filters.tag } } : {}),
      ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { content: true } } },
  });

  return rows.map((row) => toAssetRow(row, row._count.content));
}

export async function getWorkspaceFolders(workspaceId: string): Promise<string[]> {
  const rows = await prisma.asset.findMany({
    where: { workspaceId, status: "Active" },
    select: { folder: true },
    distinct: ["folder"],
  });
  return rows.map((r) => r.folder).sort();
}

export async function getWorkspaceAssetTags(workspaceId: string): Promise<string[]> {
  const rows = await prisma.asset.findMany({
    where: { workspaceId, status: "Active" },
    select: { tags: true },
  });
  const tags = new Set<string>();
  for (const row of rows) for (const tag of row.tags) tags.add(tag);
  return Array.from(tags).sort();
}

const CONTENT_STATUS_DB_TO_UI: Record<string, string> = {
  Draft: "Draft",
  Scheduled: "Scheduled",
  Published: "Published",
  NeedsReview: "Needs Review",
};

export type AssetDetail = AssetRow & {
  usedIn: { id: string; title: string; status: string }[];
};

export async function getAssetDetail(workspaceId: string, assetId: string): Promise<AssetDetail | null> {
  const row = await prisma.asset.findFirst({
    where: { id: assetId, workspaceId },
    include: { content: { select: { id: true, title: true, status: true } } },
  });
  if (!row) return null;
  return {
    ...toAssetRow(row, row.content.length),
    usedIn: row.content.map((item) => ({
      id: item.id,
      title: item.title,
      status: CONTENT_STATUS_DB_TO_UI[item.status] ?? item.status,
    })),
  };
}

/**
 * Tenant-isolation check for the byte-serving route handlers
 * (src/app/api/assets/file, .../thumbnail), which take only an assetId —
 * there's no workspaceSlug in those URLs, so this re-derives "does the
 * caller belong to this asset's workspace" the same way
 * requireWorkspaceAccess does for slug-based routes, just keyed by id.
 */
export async function requireAssetFileAccess(assetId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return null;

  const membership = await prisma.workspaceMembership.findFirst({
    where: { userId: session.user.id, workspaceId: asset.workspaceId },
    select: { id: true },
  });
  if (!membership) return null;

  return asset;
}

/** Shared by the upload route handler: inserts the Asset row and its audit log in one transaction. */
export async function createAssetRecord(params: {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  name: string;
  type: AssetType;
  folder: string;
  tags: string[];
  storageKey: string;
  thumbnailKey: string | null;
  mimeType: string;
  byteSize: number;
}): Promise<AssetRow> {
  const [row] = await prisma.$transaction([
    prisma.asset.create({
      data: {
        id: params.id,
        workspaceId: params.workspaceId,
        name: params.name,
        type: params.type as DbAssetType,
        folder: params.folder,
        tags: params.tags,
        storageKey: params.storageKey,
        thumbnailKey: params.thumbnailKey,
        mimeType: params.mimeType,
        byteSize: params.byteSize,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: params.workspaceId,
        assetId: params.id,
        actorId: params.actorId,
        actorName: params.actorName,
        action: AuditAction.AssetUploaded,
        metadata: { name: params.name, type: params.type, byteSize: params.byteSize },
      },
    }),
  ]);

  return toAssetRow(row, 0);
}
