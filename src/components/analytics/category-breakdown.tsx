"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/chart";

export type CategoryBreakdownItem = {
  label: string;
  value: number;
  colorClassName?: string;
};

/**
 * Generic horizontal breakdown bars — generalized from a platform-only
 * "reach by platform" widget so the same component covers content by
 * platform, by status, or by tag, each supplying its own labels/colors.
 */
export function CategoryBreakdown({
  data,
  formatValue = formatCount,
}: {
  data: CategoryBreakdownItem[];
  formatValue?: (value: number) => string;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row, i) => (
        <button
          key={row.label}
          type="button"
          className="flex w-full items-center gap-3 py-1 text-left"
          onMouseEnter={() => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex(i)}
          onBlur={() => setActiveIndex(null)}
          onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
          aria-label={`${row.label}: ${formatValue(row.value)}`}
        >
          <span className="w-20 shrink-0 truncate text-xs font-medium text-muted-foreground">
            {row.label}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full rounded-full transition-opacity",
                row.colorClassName ?? "bg-primary",
                activeIndex !== null && activeIndex !== i && "opacity-50"
              )}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-xs font-medium text-foreground">
            {formatValue(row.value)}
          </span>
        </button>
      ))}
    </div>
  );
}
