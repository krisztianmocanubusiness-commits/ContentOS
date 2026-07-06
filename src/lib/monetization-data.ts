import "server-only";

import {
  MonetizationCategory as DbMonetizationCategory,
  MonetizationProvider as DbMonetizationProvider,
  MonetizationStatus as DbMonetizationStatus,
  MonetizationType as DbMonetizationType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { formatShortDate } from "@/lib/format";
import {
  ALL_CATEGORIES,
  OPEN_STATUSES,
  type MonetizationCategory,
  type MonetizationProvider,
  type MonetizationStatus,
  type MonetizationType,
} from "@/lib/monetization-types";
import type { Platform } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

export const ENTRIES_PAGE_SIZE = 20;

/** The workspace's single reporting currency — summary/timeline totals only include entries in this currency (see TECH_DEBT.md: no cross-currency conversion). */
export const PRIMARY_CURRENCY = "USD";

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export type MonetizationEntryRow = {
  id: string;
  type: MonetizationType;
  category: MonetizationCategory;
  provider: MonetizationProvider;
  platform: Platform | null;
  title: string;
  counterpartyName: string | null;
  description: string | null;
  status: MonetizationStatus;
  amount: number;
  currency: string;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
};

function toEntryRow(row: {
  id: string;
  type: string;
  category: string;
  provider: string;
  platform: string | null;
  title: string;
  counterpartyName: string | null;
  description: string | null;
  status: string;
  amount: Prisma.Decimal;
  currency: string;
  date: Date;
  dueDate: Date | null;
  paidAt: Date | null;
}): MonetizationEntryRow {
  return {
    id: row.id,
    type: row.type as MonetizationType,
    category: row.category as MonetizationCategory,
    provider: row.provider as MonetizationProvider,
    platform: row.platform as Platform | null,
    title: row.title,
    counterpartyName: row.counterpartyName,
    description: row.description,
    status: row.status as MonetizationStatus,
    amount: toNumber(row.amount),
    currency: row.currency,
    date: row.date.toISOString(),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

export type MonetizationFilters = {
  search?: string;
  type?: MonetizationType;
  category?: MonetizationCategory;
  status?: MonetizationStatus;
  provider?: MonetizationProvider;
};

function buildWhere(workspaceId: string, filters: MonetizationFilters): Prisma.MonetizationEntryWhereInput {
  return {
    workspaceId,
    ...(filters.type ? { type: filters.type as DbMonetizationType } : {}),
    ...(filters.category ? { category: filters.category as DbMonetizationCategory } : {}),
    ...(filters.status ? { status: filters.status as DbMonetizationStatus } : {}),
    ...(filters.provider ? { provider: filters.provider as DbMonetizationProvider } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { counterpartyName: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

/** Cursor-paginated entry list, ordered newest-first. Mirrors the pattern established in src/lib/inbox-data.ts. */
export async function getMonetizationEntries(
  workspaceId: string,
  filters: MonetizationFilters = {},
  cursor?: string,
  limit: number = ENTRIES_PAGE_SIZE
): Promise<{ items: MonetizationEntryRow[]; nextCursor: string | null; total: number }> {
  const where = buildWhere(workspaceId, filters);

  const [rows, total] = await Promise.all([
    prisma.monetizationEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.monetizationEntry.count({ where }),
  ]);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toEntryRow);
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null, total };
}

export type MonetizationSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingRevenue: number;
  revenueChangePct: number | null;
  expensesChangePct: number | null;
  netProfitChangePct: number | null;
  currency: string;
};

/** null when there's no prior-month baseline to compare against (avoids a divide-by-zero reading as a fake percentage). */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Realized (Paid) revenue/expenses/net for the current and prior calendar
 * month, plus outstanding (not-yet-paid) revenue — scoped to
 * PRIMARY_CURRENCY only, since totals across currencies would require a
 * real FX conversion this app doesn't have (see TECH_DEBT.md). Uses
 * Prisma's `aggregate`/`_sum` (real SQL SUM/GROUP BY), not an in-memory
 * reduce over fetched rows.
 */
export async function getMonetizationSummary(
  workspaceId: string,
  now: Date = new Date()
): Promise<MonetizationSummary> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paidWhere = (from: Date, to: Date, type: DbMonetizationType) => ({
    workspaceId,
    currency: PRIMARY_CURRENCY,
    status: DbMonetizationStatus.Paid,
    type,
    date: { gte: from, lt: to },
  });

  const [
    currentRevenue,
    currentExpenses,
    prevRevenue,
    prevExpenses,
    pending,
  ] = await Promise.all([
    prisma.monetizationEntry.aggregate({
      where: paidWhere(monthStart, now, DbMonetizationType.Income),
      _sum: { amount: true },
    }),
    prisma.monetizationEntry.aggregate({
      where: paidWhere(monthStart, now, DbMonetizationType.Expense),
      _sum: { amount: true },
    }),
    prisma.monetizationEntry.aggregate({
      where: paidWhere(prevMonthStart, monthStart, DbMonetizationType.Income),
      _sum: { amount: true },
    }),
    prisma.monetizationEntry.aggregate({
      where: paidWhere(prevMonthStart, monthStart, DbMonetizationType.Expense),
      _sum: { amount: true },
    }),
    prisma.monetizationEntry.aggregate({
      where: {
        workspaceId,
        currency: PRIMARY_CURRENCY,
        type: DbMonetizationType.Income,
        status: { in: OPEN_STATUSES as DbMonetizationStatus[] },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = toNumber(currentRevenue._sum.amount);
  const totalExpenses = toNumber(currentExpenses._sum.amount);
  const prevRevenueTotal = toNumber(prevRevenue._sum.amount);
  const prevExpensesTotal = toNumber(prevExpenses._sum.amount);
  const netProfit = totalRevenue - totalExpenses;
  const prevNetProfit = prevRevenueTotal - prevExpensesTotal;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    pendingRevenue: toNumber(pending._sum.amount),
    revenueChangePct: pctChange(totalRevenue, prevRevenueTotal),
    expensesChangePct: pctChange(totalExpenses, prevExpensesTotal),
    netProfitChangePct: pctChange(netProfit, prevNetProfit),
    currency: PRIMARY_CURRENCY,
  };
}

export type CategoryBreakdownEntry = { category: MonetizationCategory; total: number };

/** Paid revenue for the trailing `days` window, grouped by category via SQL GROUP BY (Prisma's groupBy), not an in-memory tally. */
export async function getMonetizationByCategory(
  workspaceId: string,
  days: number = 90,
  now: Date = new Date()
): Promise<CategoryBreakdownEntry[]> {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const groups = await prisma.monetizationEntry.groupBy({
    by: ["category"],
    where: {
      workspaceId,
      currency: PRIMARY_CURRENCY,
      status: DbMonetizationStatus.Paid,
      type: DbMonetizationType.Income,
      date: { gte: since, lte: now },
    },
    _sum: { amount: true },
  });

  const byCategory = new Map(groups.map((g) => [g.category as MonetizationCategory, toNumber(g._sum.amount)]));
  return ALL_CATEGORIES.filter((c) => c !== "Expense").map((category) => ({
    category,
    total: byCategory.get(category) ?? 0,
  }));
}

export type MonthlyBucket = { monthLabel: string; income: number; expenses: number; net: number };

/**
 * Paid income/expenses for the last `months` calendar months, bucketed in
 * application code after a single minimal-select query — Prisma's
 * groupBy can't group by a truncated date, so this follows the same
 * convention as getPostingFrequency in analytics-data.ts rather than
 * reaching for raw SQL.
 */
export async function getMonetizationTimeline(
  workspaceId: string,
  months: number = 6,
  now: Date = new Date()
): Promise<MonthlyBucket[]> {
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await prisma.monetizationEntry.findMany({
    where: {
      workspaceId,
      currency: PRIMARY_CURRENCY,
      status: DbMonetizationStatus.Paid,
      date: { gte: rangeStart },
    },
    select: { type: true, amount: true, date: true },
  });

  const buckets = Array.from({ length: months }, (_, i) => {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    return {
      key: `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`,
      monthLabel: bucketDate.toLocaleDateString("en-US", { month: "short" }),
      income: 0,
      expenses: 0,
    };
  });
  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

  for (const row of rows) {
    const key = `${row.date.getFullYear()}-${row.date.getMonth()}`;
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    if (row.type === DbMonetizationType.Income) bucket.income += toNumber(row.amount);
    else bucket.expenses += toNumber(row.amount);
  }

  return buckets.map((b) => ({ monthLabel: b.monthLabel, income: b.income, expenses: b.expenses, net: b.income - b.expenses }));
}

export type MonetizationOverview = {
  summary: MonetizationSummary;
  categoryBreakdown: CategoryBreakdownEntry[];
  timeline: MonthlyBucket[];
};

/** Everything the page needs above the fold, run in parallel. */
export async function getMonetizationOverview(workspaceId: string): Promise<MonetizationOverview> {
  const [summary, categoryBreakdown, timeline] = await Promise.all([
    getMonetizationSummary(workspaceId),
    getMonetizationByCategory(workspaceId),
    getMonetizationTimeline(workspaceId),
  ]);
  return { summary, categoryBreakdown, timeline };
}

/** Kept for anywhere a plain "Jul 3" label is wanted from a MonetizationEntryRow's ISO date string. */
export function shortDateLabel(iso: string | null): string | null {
  return iso ? formatShortDate(new Date(iso)) : null;
}
