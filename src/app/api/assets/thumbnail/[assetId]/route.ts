import { NextResponse } from "next/server";

import { requireAssetFileAccess } from "@/lib/asset-data";
import { getStorageAdapter } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const asset = await requireAssetFileAccess(assetId);
  if (!asset || !asset.thumbnailKey) return new NextResponse("Not found", { status: 404 });

  const data = await getStorageAdapter().get(asset.thumbnailKey);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Blob([new Uint8Array(data)]), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
