import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const {
  getMonetizationEntries,
  getMonetizationSummary,
  getMonetizationByCategory,
  getMonetizationTimeline,
} = await import("@/lib/monetization-data");

const WORKSPACE_ID = `ws-mon-data-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-mon-data-other-${randomUUID()}`;

const NOW = new Date("2026-07-06T12:00:00Z");
const THIS_MONTH = new Date("2026-07-01T00:00:00Z");
const LAST_MONTH = new Date("2026-06-10T00:00:00Z");
const TWO_MONTHS_AGO = new Date("2026-05-10T00:00:00Z");

const SPONSORSHIP_PAID_ID = randomUUID();
const AFFILIATE_PENDING_ID = randomUUID();
const EXPENSE_PAID_ID = randomUUID();
const OTHER_WORKSPACE_ENTRY_ID = randomUUID();

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Mon Data Workspace", slug: `md-${randomUUID()}`, plan: "Free", initials: "MD" },
      { id: OTHER_WORKSPACE_ID, name: "Mon Data Other Workspace", slug: `md-other-${randomUUID()}`, plan: "Free", initials: "MX" },
    ],
  });

  await prisma.monetizationEntry.createMany({
    data: [
      {
        id: SPONSORSHIP_PAID_ID,
        workspaceId: WORKSPACE_ID,
        type: "Income",
        category: "Sponsorship",
        title: "Glowlux reel package",
        counterpartyName: "Glowlux Skincare",
        status: "Paid",
        amount: 4500,
        currency: "USD",
        date: THIS_MONTH,
        paidAt: THIS_MONTH,
      },
      {
        id: AFFILIATE_PENDING_ID,
        workspaceId: WORKSPACE_ID,
        type: "Income",
        category: "Affiliate",
        title: "Amazon payout",
        status: "Pending",
        amount: 300,
        currency: "USD",
        date: THIS_MONTH,
      },
      {
        id: EXPENSE_PAID_ID,
        workspaceId: WORKSPACE_ID,
        type: "Expense",
        category: "Expense",
        title: "Editor contractor",
        status: "Paid",
        amount: 1200,
        currency: "USD",
        date: THIS_MONTH,
        paidAt: THIS_MONTH,
      },
      {
        id: randomUUID(),
        workspaceId: WORKSPACE_ID,
        type: "Income",
        category: "PlatformRevenue",
        title: "Last month AdSense",
        status: "Paid",
        amount: 1000,
        currency: "USD",
        date: LAST_MONTH,
        paidAt: LAST_MONTH,
      },
      {
        id: randomUUID(),
        workspaceId: WORKSPACE_ID,
        type: "Income",
        category: "Merchandise",
        title: "Old merch sale",
        status: "Paid",
        amount: 500,
        currency: "USD",
        date: TWO_MONTHS_AGO,
        paidAt: TWO_MONTHS_AGO,
      },
      {
        id: randomUUID(),
        workspaceId: WORKSPACE_ID,
        type: "Income",
        category: "Sponsorship",
        title: "EUR sponsorship (non-primary currency)",
        status: "Paid",
        amount: 2000,
        currency: "EUR",
        date: THIS_MONTH,
        paidAt: THIS_MONTH,
      },
      {
        id: OTHER_WORKSPACE_ENTRY_ID,
        workspaceId: OTHER_WORKSPACE_ID,
        type: "Income",
        category: "Sponsorship",
        title: "Not yours",
        status: "Paid",
        amount: 9999,
        currency: "USD",
        date: THIS_MONTH,
        paidAt: THIS_MONTH,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.$disconnect();
});

describe("getMonetizationEntries", () => {
  it("never returns another workspace's entries", async () => {
    const { items } = await getMonetizationEntries(WORKSPACE_ID);
    expect(items.some((e) => e.id === OTHER_WORKSPACE_ENTRY_ID)).toBe(false);
  });

  it("filters by type", async () => {
    const { items } = await getMonetizationEntries(WORKSPACE_ID, { type: "Expense" });
    expect(items.map((e) => e.id)).toEqual([EXPENSE_PAID_ID]);
  });

  it("filters by category", async () => {
    const { items } = await getMonetizationEntries(WORKSPACE_ID, { category: "Affiliate" });
    expect(items.map((e) => e.id)).toEqual([AFFILIATE_PENDING_ID]);
  });

  it("filters by status", async () => {
    const { items } = await getMonetizationEntries(WORKSPACE_ID, { status: "Pending" });
    expect(items.map((e) => e.id)).toEqual([AFFILIATE_PENDING_ID]);
  });

  it("searches title and counterparty name", async () => {
    const byTitle = await getMonetizationEntries(WORKSPACE_ID, { search: "reel package" });
    expect(byTitle.items.map((e) => e.id)).toEqual([SPONSORSHIP_PAID_ID]);

    const byCounterparty = await getMonetizationEntries(WORKSPACE_ID, { search: "glowlux" });
    expect(byCounterparty.items.map((e) => e.id)).toEqual([SPONSORSHIP_PAID_ID]);
  });

  it("cursor-paginates without skipping or repeating rows", async () => {
    const page1 = await getMonetizationEntries(WORKSPACE_ID, {}, undefined, 3);
    expect(page1.items).toHaveLength(3);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.total).toBe(6);

    const page2 = await getMonetizationEntries(WORKSPACE_ID, {}, page1.nextCursor!, 3);
    const page1Ids = page1.items.map((e) => e.id);
    const page2Ids = page2.items.map((e) => e.id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    expect(page1Ids.length + page2Ids.length).toBe(6);
  });
});

describe("getMonetizationSummary", () => {
  it("sums realized (Paid) revenue/expenses for the current calendar month, scoped to the primary currency", async () => {
    const summary = await getMonetizationSummary(WORKSPACE_ID, NOW);
    // Sponsorship (4500) paid this month, in USD — the EUR sponsorship must not count.
    expect(summary.totalRevenue).toBe(4500);
    expect(summary.totalExpenses).toBe(1200);
    expect(summary.netProfit).toBe(3300);
  });

  it("computes pending revenue from non-Paid Income statuses", async () => {
    const summary = await getMonetizationSummary(WORKSPACE_ID, NOW);
    expect(summary.pendingRevenue).toBe(300);
  });

  it("compares against last month's realized total for the change percentage", async () => {
    const summary = await getMonetizationSummary(WORKSPACE_ID, NOW);
    // current 4500 vs prior 1000 -> +350%
    expect(summary.revenueChangePct).toBeCloseTo(350, 0);
  });

  it("never includes another workspace's entries", async () => {
    const summary = await getMonetizationSummary(WORKSPACE_ID, NOW);
    expect(summary.totalRevenue).toBeLessThan(9999);
  });
});

describe("getMonetizationByCategory", () => {
  it("sums paid income by category within the window, excluding Expense and non-primary currency", async () => {
    const breakdown = await getMonetizationByCategory(WORKSPACE_ID, 90, NOW);
    const byCategory = Object.fromEntries(breakdown.map((b) => [b.category, b.total]));
    expect(byCategory.Sponsorship).toBe(4500);
    expect(byCategory.PlatformRevenue).toBe(1000);
    expect(byCategory.Affiliate).toBe(0);
    expect(byCategory.Expense).toBeUndefined();
  });
});

describe("getMonetizationTimeline", () => {
  it("buckets paid income/expenses by calendar month", async () => {
    const timeline = await getMonetizationTimeline(WORKSPACE_ID, 3, NOW);
    expect(timeline).toHaveLength(3);
    const thisMonth = timeline[timeline.length - 1];
    expect(thisMonth.income).toBe(4500);
    expect(thisMonth.expenses).toBe(1200);
    expect(thisMonth.net).toBe(3300);

    const lastMonth = timeline[timeline.length - 2];
    expect(lastMonth.income).toBe(1000);
  });
});
