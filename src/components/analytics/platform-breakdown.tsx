"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { platformColor } from "@/lib/platform";
import { formatReachK } from "@/lib/chart";
import type { PlatformReach } from "@/lib/mock-data";

export function PlatformBreakdown({ data }: { data: PlatformReach[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row, i) => (
        <button
          key={row.platform}
          type="button"
          className="flex w-full items-center gap-3 py-1 text-left"
          onMouseEnter={() => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex(i)}
          onBlur={() => setActiveIndex(null)}
          onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
          aria-label={`${row.platform}: ${formatReachK(row.value)} reach`}
        >
          <span className="w-16 shrink-0 truncate text-xs font-medium text-muted-foreground">
            {row.platform}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full rounded-full transition-opacity",
                platformColor[row.platform],
                activeIndex !== null && activeIndex !== i && "opacity-50"
              )}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="w-14 shrink-0 text-right text-xs font-medium text-foreground">
            {formatReachK(row.value)}
          </span>
        </button>
      ))}
    </div>
  );
}
