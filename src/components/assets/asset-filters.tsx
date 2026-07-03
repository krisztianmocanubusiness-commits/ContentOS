"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetType } from "@/lib/mock-data";

const TYPES: AssetType[] = ["Image", "Video", "Audio", "Document"];

export function AssetFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  folder,
  onFolderChange,
  folders,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  type: AssetType | "All";
  onTypeChange: (value: AssetType | "All") => void;
  folder: string | "All";
  onFolderChange: (value: string) => void;
  folders: string[];
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search assets..."
          className="pl-8"
        />
      </div>
      <Select value={type} onValueChange={(value) => onTypeChange(value as AssetType | "All")}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All types</SelectItem>
          {TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {folders.length > 0 && (
        <Select value={folder} onValueChange={onFolderChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All folders</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
