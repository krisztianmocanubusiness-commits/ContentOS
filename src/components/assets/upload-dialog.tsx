"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetType } from "@/lib/mock-data";

const TYPES: AssetType[] = ["Image", "Video", "Audio", "Document"];

export function mockSizeFor(type: AssetType): string {
  const ranges: Record<AssetType, [number, number]> = {
    Image: [0.2, 5],
    Video: [20, 200],
    Audio: [1, 15],
    Document: [0.1, 3],
  };
  const [min, max] = ranges[type];
  const value = min + Math.random() * (max - min);
  return value >= 1 ? `${value.toFixed(1)} MB` : `${Math.round(value * 1000)} KB`;
}

export function UploadDialog({
  open,
  onOpenChange,
  defaultFolder,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolder: string;
  onUpload: (asset: {
    name: string;
    type: AssetType;
    folder: string;
    tags: string[];
  }) => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AssetType>("Image");
  const [tags, setTags] = React.useState("");
  const folderRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setType("Image");
    setTags("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onUpload({
      name: trimmedName,
      type,
      folder: folderRef.current?.value.trim() || "Uncategorized",
      tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload asset</DialogTitle>
          <DialogDescription>
            Uploads are mocked for now — this adds a placeholder record, not a
            real file.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-name">File name</Label>
            <Input
              id="asset-name"
              placeholder="e.g. summer-campaign-hero.png"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as AssetType)}>
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-folder">Folder</Label>
              <Input
                id="asset-folder"
                key={open ? defaultFolder : "closed"}
                ref={folderRef}
                placeholder="e.g. Brand Assets"
                defaultValue={defaultFolder}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-tags">Tags</Label>
            <Input
              id="asset-tags"
              placeholder="Comma-separated, e.g. campaign, hero"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Upload</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
