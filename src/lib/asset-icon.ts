import { FileText, Image as ImageIcon, Music, Video, type LucideIcon } from "lucide-react";

import type { Asset } from "@/lib/mock-data";

export const assetTypeIcon: Record<Asset["type"], LucideIcon> = {
  Image: ImageIcon,
  Video: Video,
  Audio: Music,
  Document: FileText,
};
