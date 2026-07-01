"use client";

import { FolderOpen, Upload } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsForWorkspace } from "@/lib/mock-data";
import { assetTypeIcon } from "@/lib/asset-icon";
import { useWorkspace } from "@/context/workspace-context";

export default function AssetsPage() {
  const { activeWorkspace } = useWorkspace();
  const assets = assetsForWorkspace(activeWorkspace.id);

  return (
    <div>
      <PageHeader
        title="Assets"
        description={`Every image, video, and file used in ${activeWorkspace.name}.`}
        action={
          <Button>
            <Upload />
            Upload asset
          </Button>
        }
      />

      {assets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FolderOpen className="size-8 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No assets yet</p>
            <p className="text-sm text-muted-foreground">
              Upload images, videos, and files for {activeWorkspace.name} to
              use them in content.
            </p>
          </div>
          <Button size="sm" className="mt-1">
            <Upload />
            Upload asset
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const Icon = assetTypeIcon[asset.type];
            return (
              <Card key={asset.id} className="gap-0 overflow-hidden py-0">
                <div className="flex aspect-video items-center justify-center bg-muted">
                  <Icon className="size-8 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{asset.name}</p>
                    <Badge variant="outline">{asset.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {asset.size} · Added {asset.date} · Used in {asset.usedIn}{" "}
                    {asset.usedIn === 1 ? "post" : "posts"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
