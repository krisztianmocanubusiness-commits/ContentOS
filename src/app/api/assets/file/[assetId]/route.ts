import { NextResponse } from "next/server";

import { requireAssetFileAccess } from "@/lib/asset-data";
import { getStorageAdapter } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const asset = await requireAssetFileAccess(assetId);
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const data = await getStorageAdapter().get(asset.storageKey);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Blob([new Uint8Array(data)]), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
