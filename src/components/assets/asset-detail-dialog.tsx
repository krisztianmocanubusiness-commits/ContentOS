"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { assetTypeIcon } from "@/lib/asset-icon";
import { contentUsingAsset, type Asset } from "@/lib/mock-data";
import { statusVariant } from "@/lib/status";

export function AssetDetailDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!asset) return null;

  const Icon = assetTypeIcon[asset.type];
  const usedIn = contentUsingAsset(asset.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{asset.name}</DialogTitle>
          <DialogDescription>
            {asset.type} · {asset.size} · Added {asset.date}
          </DialogDescription>
        </DialogHeader>

        <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
          <Icon className="size-10 text-muted-foreground" />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Folder</span>
          <Badge variant="outline" className="w-fit">
            {asset.folder}
          </Badge>
        </div>

        {asset.tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {asset.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Used in {usedIn.length === 0 ? "no content yet" : `${usedIn.length} ${usedIn.length === 1 ? "post" : "posts"}`}
          </span>
          {usedIn.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {usedIn.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
