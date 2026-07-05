"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, Trash2, Upload } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AssetDetailDialog } from "@/components/assets/asset-detail-dialog";
import { AssetFilters } from "@/components/assets/asset-filters";
import { UploadDialog } from "@/components/assets/upload-dialog";
import { PermissionButton } from "@/components/permissions/permission-button";
import { getAssetDetailAction } from "@/lib/asset-actions";
import type { AssetDetail, AssetRow } from "@/lib/asset-data";
import { assetTypeIcon } from "@/lib/asset-icon";
import type { AssetType } from "@/lib/asset-types";
import { formatBytes } from "@/lib/format";
import { usePermission } from "@/hooks/use-permission";

export function AssetsBoard({
  workspaceSlug,
  workspaceName,
  initialAssets,
  folders,
  tags,
  view,
}: {
  workspaceSlug: string;
  workspaceName: string;
  initialAssets: AssetRow[];
  folders: string[];
  tags: string[];
  view: "active" | "trash";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = usePermission("createContent");

  const [assets, setAssets] = React.useState(initialAssets);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<AssetType | "All">("All");
  const [folder, setFolder] = React.useState("All");
  const [tag, setTag] = React.useState("All");
  const [selectedAsset, setSelectedAsset] = React.useState<AssetDetail | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const [prevInitialAssets, setPrevInitialAssets] = React.useState(initialAssets);
  if (initialAssets !== prevInitialAssets) {
    setPrevInitialAssets(initialAssets);
    setAssets(initialAssets);
  }

  const filteredAssets = assets.filter((asset) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = query.length === 0 || asset.name.toLowerCase().includes(query);
    const matchesType = type === "All" || asset.type === type;
    const matchesFolder = folder === "All" || asset.folder === folder;
    const matchesTag = tag === "All" || asset.tags.includes(tag);
    return matchesSearch && matchesType && matchesFolder && matchesTag;
  });

  function switchView(next: "active" | "trash") {
    const params = new URLSearchParams(searchParams);
    if (next === "trash") params.set("view", "trash");
    else params.delete("view");
    router.push(`/w/${workspaceSlug}/assets${params.size > 0 ? `?${params}` : ""}`);
  }

  async function openAsset(assetId: string) {
    setDetailOpen(true);
    setSelectedAsset(null);
    const detail = await getAssetDetailAction(workspaceSlug, assetId);
    setSelectedAsset(detail);
  }

  function handleUploaded() {
    router.refresh();
  }

  function handleChanged() {
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        description={`Every image, video, and file used in ${workspaceName}.`}
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={view === "trash" ? "default" : "outline"}
              size="sm"
              onClick={() => switchView(view === "trash" ? "active" : "trash")}
            >
              <Trash2 />
              {view === "trash" ? "Back to assets" : "Trash"}
            </Button>
            {view === "active" && (
              <PermissionButton permission="createContent" onClick={() => setUploadOpen(true)}>
                <Upload />
                Upload asset
              </PermissionButton>
            )}
          </div>
        }
      />

      {assets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          {view === "trash" ? (
            <>
              <Trash2 className="size-8 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Trash is empty</p>
                <p className="text-sm text-muted-foreground">Deleted assets show up here and can be restored.</p>
              </div>
            </>
          ) : (
            <>
              <FolderOpen className="size-8 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">No assets yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload images, videos, and files for {workspaceName} to use them in content.
                </p>
              </div>
              <PermissionButton permission="createContent" size="sm" className="mt-1" onClick={() => setUploadOpen(true)}>
                <Upload />
                Upload asset
              </PermissionButton>
            </>
          )}
        </Card>
      ) : (
        <>
          <AssetFilters
            search={search}
            onSearchChange={setSearch}
            type={type}
            onTypeChange={setType}
            folder={folder}
            onFolderChange={setFolder}
            folders={folders}
            tag={tag}
            onTagChange={setTag}
            tags={tags}
          />

          {filteredAssets.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-1 py-16 text-center">
              <p className="text-sm font-medium">No assets match your filters</p>
              <p className="text-sm text-muted-foreground">Try a different search term, type, folder, or tag.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => {
                const Icon = assetTypeIcon[asset.type];
                return (
                  <Card
                    key={asset.id}
                    className="cursor-pointer gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40"
                    onClick={() => openAsset(asset.id)}
                  >
                    <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
                      {asset.hasThumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/assets/thumbnail/${asset.id}`}
                          alt={asset.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Icon className="size-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{asset.name}</p>
                        <Badge variant="outline">{asset.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(asset.byteSize)} · Added {asset.dateLabel} · Used in {asset.usedInCount}{" "}
                        {asset.usedInCount === 1 ? "post" : "posts"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{asset.folder}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <AssetDetailDialog
        asset={selectedAsset}
        workspaceSlug={workspaceSlug}
        canManage={canManage}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedAsset(null);
        }}
        onChanged={handleChanged}
      />

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        workspaceSlug={workspaceSlug}
        defaultFolder={folders[0] ?? ""}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
