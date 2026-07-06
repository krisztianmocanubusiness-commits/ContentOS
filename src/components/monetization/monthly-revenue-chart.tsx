"use client";

import * as React from "react";

import { formatCount, niceMax } from "@/lib/chart";
import type { MonthlyBucket } from "@/lib/monetization-data";
import { cn } from "@/lib/utils";

/**
 * Grouped bar chart: two categorical series (income, expense) per month.
 * Only 2 series, so color alone is comfortable per the dataviz skill's
 * series-count ladder — but a legend and direct labels ship anyway since
 * the WCAG contrast check on the expense hue (amber) comes back as a
 * WARN, which the skill treats as mandatory secondary encoding, not
 * optional polish. Colors are the validated --chart-income/--chart-expense
 * pair (src/app/globals.css) — light and dark mode each have their own
 * validated step, not an automatic flip.
 */
export function MonthlyRevenueChart({ data, currency }: { data: MonthlyBucket[]; currency: string }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1));
  const ticks = [max, max * 0.5, 0];
  const active = activeIndex !== null ? data[activeIndex] : null;

  const formatValue = (value: number) => `${currency === "USD" ? "$" : ""}${formatCount(value)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-income" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-expense" />
          Expenses
        </span>
      </div>

      <div className="relative">
        {active && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${((activeIndex! + 0.5) / data.length) * 100}%` }}
          >
            <div className="font-semibold text-chart-income">{formatValue(active.income)} income</div>
            <div className="font-semibold text-chart-expense">{formatValue(active.expenses)} expenses</div>
            <div className="text-muted-foreground">{active.monthLabel}</div>
          </div>
        )}

        <div className="flex h-48 gap-3">
          <div className="flex w-10 shrink-0 flex-col justify-between py-0.5 text-right text-[11px] text-muted-foreground">
            {ticks.map((tick) => (
              <span key={tick}>{formatValue(tick)}</span>
            ))}
          </div>

          <div className="relative flex flex-1 items-end gap-2">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {ticks.map((tick) => (
                <div key={tick} className="border-t border-border/60" />
              ))}
            </div>

            {data.map((bucket, i) => {
              const incomeHeightPct = (bucket.income / max) * 100;
              const expensesHeightPct = (bucket.expenses / max) * 100;
              return (
                <button
                  key={bucket.monthLabel + i}
                  type="button"
                  className="group relative flex h-full flex-1 items-end gap-1"
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
                  aria-label={`${bucket.monthLabel}: ${formatValue(bucket.income)} income, ${formatValue(bucket.expenses)} expenses`}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-[4px] bg-chart-income/80 transition-colors",
                      activeIndex === i && "bg-chart-income"
                    )}
                    style={{ height: `${incomeHeightPct}%` }}
                  />
                  <div
                    className={cn(
                      "w-full rounded-t-[4px] bg-chart-expense/80 transition-colors",
                      activeIndex === i && "bg-chart-expense"
                    )}
                    style={{ height: `${expensesHeightPct}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1.5 flex gap-3 pl-[3.25rem]">
          {data.map((bucket, i) => (
            <span key={bucket.monthLabel + i} className="flex-1 text-center text-[11px] text-muted-foreground">
              {bucket.monthLabel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
