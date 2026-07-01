"use client";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Platform } from "@/lib/mock-data";

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "X", "LinkedIn", "YouTube"];

export function ContentFilters({
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  tags,
  activeTag,
  onTagToggle,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  platform: Platform | "All";
  onPlatformChange: (value: Platform | "All") => void;
  tags: string[];
  activeTag: string | null;
  onTagToggle: (tag: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search content..."
            className="pl-8"
          />
        </div>
        <Select
          value={platform}
          onValueChange={(value) => onPlatformChange(value as Platform | "All")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={activeTag === tag ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => onTagToggle(tag)}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
