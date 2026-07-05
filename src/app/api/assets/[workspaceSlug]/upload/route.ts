import { randomUUID } from "node:crypto";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { createAssetRecord } from "@/lib/asset-data";
import type { AssetType } from "@/lib/asset-types";
import { hasPermission } from "@/lib/permissions";
import { getStorageAdapter, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const THUMBNAIL_SIZE = 400;

function assetTypeForMime(mime: string): AssetType {
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  return "Document";
}

/**
 * File bytes go through this route handler, not a Server Action — Next's
 * Server Actions cap request bodies at 1MB by default, which is a
 * non-starter for video/document uploads. Bytes are read into memory
 * once here and handed to the storage adapter; see TECH_DEBT.md for the
 * size/memory tradeoff this implies at larger scale.
 */
export async function POST(request: Request, { params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "createContent")) {
    return NextResponse.json({ error: "Your role can't upload assets." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Files must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB or smaller.` },
      { status: 400 }
    );
  }

  const folder = (formData.get("folder") as string | null)?.trim() || "Uncategorized";
  const tagsRaw = (formData.get("tags") as string | null) ?? "";
  const tags = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = assetTypeForMime(file.type);
  const assetId = randomUUID();
  const storageKey = `${workspace.id}/${assetId}/original`;

  const storage = getStorageAdapter();
  await storage.put(storageKey, buffer);

  let thumbnailKey: string | null = null;
  if (type === "Image") {
    try {
      const thumbnail = await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const key = `${workspace.id}/${assetId}/thumbnail.webp`;
      await storage.put(key, thumbnail);
      thumbnailKey = key;
    } catch {
      // Unsupported/corrupt image bytes — fall back to the type icon in the UI, not a fatal upload error.
      thumbnailKey = null;
    }
  }

  const asset = await createAssetRecord({
    id: assetId,
    workspaceId: workspace.id,
    actorId: userId,
    actorName: userName,
    name: file.name || "Untitled",
    type,
    folder,
    tags,
    storageKey,
    thumbnailKey,
    mimeType: file.type || "application/octet-stream",
    byteSize: file.size,
  });

  return NextResponse.json({ asset });
}
