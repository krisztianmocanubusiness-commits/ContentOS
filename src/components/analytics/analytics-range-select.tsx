"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics-range";

/**
 * The only interactive piece of the Analytics page — changing the range
 * pushes a new URL search param, which re-renders the (Server Component)
 * page with freshly queried data for that window.
 */
export function AnalyticsRangeSelect({
  workspaceSlug,
  currentRange,
}: {
  workspaceSlug: string;
  currentRange: AnalyticsRange;
}) {
  const router = useRouter();

  return (
    <Select
      value={currentRange}
      onValueChange={(value) => router.push(`/w/${workspaceSlug}/analytics?range=${value}`)}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ANALYTICS_RANGES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
