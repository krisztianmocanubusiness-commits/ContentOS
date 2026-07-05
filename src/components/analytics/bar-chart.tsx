"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { niceMax, formatCount } from "@/lib/chart";

export type BarChartPoint = {
  label: string;
  value: number;
};

/**
 * Generic hoverable bar chart — originally built for a "reach" metric,
 * generalized so any workspace analytics service (posting frequency,
 * calendar activity, future metrics) can reuse it with its own unit
 * label and value formatting instead of assuming reach-in-thousands.
 */
export function BarChart({
  data,
  unitLabel = "",
  formatValue = formatCount,
}: {
  data: BarChartPoint[];
  unitLabel?: string;
  formatValue?: (value: number) => string;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const ticks = [max, max * 0.5, 0];
  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="relative">
      {active && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${((activeIndex! + 0.5) / data.length) * 100}%`,
          }}
        >
          <div className="font-semibold text-foreground">
            {formatValue(active.value)} {unitLabel}
          </div>
          <div className="text-muted-foreground">{active.label}</div>
        </div>
      )}

      <div className="flex h-48 gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-0.5 text-right text-[11px] text-muted-foreground">
          {ticks.map((tick) => (
            <span key={tick}>{formatValue(tick)}</span>
          ))}
        </div>

        <div className="relative flex flex-1 items-end gap-2">
          {/* Gridlines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <div key={tick} className="border-t border-border/60" />
            ))}
          </div>

          {data.map((point, i) => {
            const isLast = i === data.length - 1;
            const heightPct = (point.value / max) * 100;
            return (
              <button
                key={point.label + i}
                type="button"
                className="group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
                aria-label={`${point.label}: ${formatValue(point.value)} ${unitLabel}`}
              >
                {isLast && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-medium text-foreground">
                    {formatValue(point.value)}
                  </span>
                )}
                <div
                  className={cn(
                    "w-full rounded-t-[4px] bg-primary/80 transition-colors",
                    (activeIndex === i || isLast) && "bg-primary"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
