"use client";

import * as React from "react";
import { FolderOpen, Upload } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetDetailDialog } from "@/components/assets/asset-detail-dialog";
import { UploadDialog, mockSizeFor } from "@/components/assets/upload-dialog";
import { PermissionButton } from "@/components/permissions/permission-button";
import {
  assets as seedAssets,
  contentUsingAsset,
  foldersForWorkspace,
  type Asset,
  type AssetType,
} from "@/lib/mock-data";
import { assetTypeIcon } from "@/lib/asset-icon";
import { useWorkspace } from "@/context/workspace-context";

export default function AssetsPage() {
  const { activeWorkspace } = useWorkspace();
  const [assets, setAssets] = React.useState(seedAssets);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<AssetType | "All">("All");
  const [folder, setFolder] = React.useState<string>("All");
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const workspaceAssets = assets.filter(
    (asset) => asset.workspaceId === activeWorkspace.id
  );
  const folders = foldersForWorkspace(activeWorkspace.id);

  const filteredAssets = workspaceAssets.filter((asset) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 || asset.name.toLowerCase().includes(query);
    const matchesType = type === "All" || asset.type === type;
    const matchesFolder = folder === "All" || asset.folder === folder;
    return matchesSearch && matchesType && matchesFolder;
  });

  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) ?? null;

  function handleUpload(input: {
    name: string;
    type: AssetType;
    folder: string;
    tags: string[];
  }) {
    const newAsset: Asset = {
      id: `a-${Date.now().toString(36)}`,
      workspaceId: activeWorkspace.id,
      name: input.name,
      type: input.type,
      folder: input.folder,
      tags: input.tags,
      size: mockSizeFor(input.type),
      date: "Just now",
    };
    setAssets((prev) => [newAsset, ...prev]);
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        description={`Every image, video, and file used in ${activeWorkspace.name}.`}
        action={
          <PermissionButton permission="createContent" onClick={() => setUploadOpen(true)}>
            <Upload />
            Upload asset
          </PermissionButton>
        }
      />

      {workspaceAssets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FolderOpen className="size-8 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No assets yet</p>
            <p className="text-sm text-muted-foreground">
              Upload images, videos, and files for {activeWorkspace.name} to
              use them in content.
            </p>
          </div>
          <PermissionButton
            permission="createContent"
            size="sm"
            className="mt-1"
            onClick={() => setUploadOpen(true)}
          >
            <Upload />
            Upload asset
          </PermissionButton>
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
          />

          {filteredAssets.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-1 py-16 text-center">
              <p className="text-sm font-medium">No assets match your filters</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term, type, or folder.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => {
                const Icon = assetTypeIcon[asset.type];
                const usedInCount = contentUsingAsset(asset.id).length;
                return (
                  <Card
                    key={asset.id}
                    className="cursor-pointer gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40"
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      <Icon className="size-8 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{asset.name}</p>
                        <Badge variant="outline">{asset.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {asset.size} · Added {asset.date} · Used in {usedInCount}{" "}
                        {usedInCount === 1 ? "post" : "posts"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {asset.folder}
                      </p>
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
        open={selectedAsset !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAssetId(null);
        }}
      />

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultFolder={folders[0] ?? ""}
        onUpload={handleUpload}
      />
    </div>
  );
}
