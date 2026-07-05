import { FileText, Image as ImageIcon, Music, Video, type LucideIcon } from "lucide-react";

import type { AssetType } from "@/lib/asset-types";

export const assetTypeIcon: Record<AssetType, LucideIcon> = {
  Image: ImageIcon,
  Video: Video,
  Audio: Music,
  Document: FileText,
};
