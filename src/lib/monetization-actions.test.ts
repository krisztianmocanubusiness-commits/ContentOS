import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const {
  createMonetizationEntryAction,
  updateMonetizationEntryAction,
  updateMonetizationEntryStatusAction,
  deleteMonetizationEntryAction,
  getMonetizationEntriesAction,
} = await import("@/lib/monetization-actions");

const SLUG = `test-mon-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-mon-actions-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-mon-actions-other-${randomUUID()}`;

const OWNER = { id: `user-ma-owner-${randomUUID()}`, name: "Mon Owner", initials: "MO" };
const ADMIN = { id: `user-ma-admin-${randomUUID()}`, name: "Mon Admin", initials: "MA" };
const OUTSIDER = { id: `user-ma-outsider-${randomUUID()}`, name: "Mon Outsider", initials: "MX" };

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

async function createTestEntry(overrides: Partial<{ workspaceId: string; status: string; category: string; type: string }> = {}) {
  const id = randomUUID();
  await prisma.monetizationEntry.create({
    data: {
      id,
      workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
      type: (overrides.type as "Income" | "Expense") ?? "Income",
      category: (overrides.category as never) ?? "Sponsorship",
      title: "Test entry",
      status: (overrides.status as never) ?? "Pending",
      amount: 500,
      currency: "USD",
    },
  });
  return id;
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Mon Actions Workspace", slug: SLUG, plan: "Free", initials: "MA" },
      { id: OTHER_WORKSPACE_ID, name: "Mon Actions Other Workspace", slug: `${SLUG}-other`, plan: "Free", initials: "MX" },
    ],
  });

  for (const user of [OWNER, ADMIN, OUTSIDER]) {
    await prisma.user.create({
      data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
    });
  }

  await prisma.workspaceMembership.createMany({
    data: [
      { id: randomUUID(), userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: ADMIN.id, workspaceId: WORKSPACE_ID, role: "Admin", status: "Active" },
      { id: randomUUID(), userId: OUTSIDER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, ADMIN.id, OUTSIDER.id] } } });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("createMonetizationEntryAction", () => {
  it("creates an Income entry, derives its type from category, and records an audit log", async () => {
    actAs(OWNER);

    const result = await createMonetizationEntryAction(SLUG, {
      category: "Sponsorship",
      title: "Instagram reel package",
      counterpartyName: "Glowlux Skincare",
      amount: 4500,
      currency: "USD",
    });

    expect(result).toMatchObject({ ok: true, data: { type: "Income", category: "Sponsorship", amount: 4500 } });
    if (!result.ok) throw new Error("expected ok");

    const row = await prisma.monetizationEntry.findUniqueOrThrow({ where: { id: result.data.id } });
    expect(row.type).toBe("Income");
    expect(row.workspaceId).toBe(WORKSPACE_ID);

    const audits = await prisma.auditLog.findMany({ where: { monetizationEntryId: row.id, action: "MonetizationEntryCreated" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(OWNER.id);
  });

  it("derives Expense type from the Expense category", async () => {
    actAs(OWNER);
    const result = await createMonetizationEntryAction(SLUG, { category: "Expense", title: "AWS hosting", amount: 100 });
    expect(result).toMatchObject({ ok: true, data: { type: "Expense" } });
  });

  it("stamps paidAt when created directly with status Paid", async () => {
    actAs(OWNER);
    const result = await createMonetizationEntryAction(SLUG, {
      category: "Affiliate",
      title: "Backdated payout",
      amount: 200,
      status: "Paid",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const row = await prisma.monetizationEntry.findUniqueOrThrow({ where: { id: result.data.id } });
    expect(row.paidAt).not.toBeNull();
  });

  it("rejects a blank title", async () => {
    actAs(OWNER);
    const result = await createMonetizationEntryAction(SLUG, { category: "Sponsorship", title: "   ", amount: 100 });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("rejects a negative amount", async () => {
    actAs(OWNER);
    const result = await createMonetizationEntryAction(SLUG, { category: "Sponsorship", title: "Bad amount", amount: -5 });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("rejects an unsupported currency", async () => {
    actAs(OWNER);
    const result = await createMonetizationEntryAction(SLUG, {
      category: "Sponsorship",
      title: "Bad currency",
      amount: 100,
      currency: "JPY",
    });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids an Admin (manageMonetization is Owner-only)", async () => {
    actAs(ADMIN);
    const result = await createMonetizationEntryAction(SLUG, { category: "Sponsorship", title: "Blocked", amount: 100 });
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    await expect(
      createMonetizationEntryAction(SLUG, { category: "Sponsorship", title: "Nope", amount: 100 })
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") });
  });
});

describe("updateMonetizationEntryAction", () => {
  it("updates fields, re-derives type when category changes, and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestEntry({ category: "Sponsorship" });

    const result = await updateMonetizationEntryAction(SLUG, id, { category: "Expense", title: "Now an expense", amount: 250 });

    expect(result).toMatchObject({ ok: true, data: { type: "Expense", category: "Expense", title: "Now an expense" } });
    const audits = await prisma.auditLog.findMany({ where: { monetizationEntryId: id, action: "MonetizationEntryUpdated" } });
    expect(audits).toHaveLength(1);
  });

  it("blocks updating another workspace's entry", async () => {
    actAs(OWNER);
    const foreignId = await createTestEntry({ workspaceId: OTHER_WORKSPACE_ID });

    const result = await updateMonetizationEntryAction(SLUG, foreignId, { title: "Hacked" });

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("forbids an Admin from updating", async () => {
    actAs(OWNER);
    const id = await createTestEntry();
    actAs(ADMIN);

    const result = await updateMonetizationEntryAction(SLUG, id, { title: "Blocked" });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("updateMonetizationEntryStatusAction", () => {
  it("transitions status, stamps paidAt on first transition to Paid, and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestEntry({ status: "Pending" });

    const result = await updateMonetizationEntryStatusAction(SLUG, id, "Paid");

    expect(result).toMatchObject({ ok: true, data: { status: "Paid" } });
    const row = await prisma.monetizationEntry.findUniqueOrThrow({ where: { id } });
    expect(row.paidAt).not.toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { monetizationEntryId: id, action: "MonetizationEntryStatusChanged" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].metadata).toMatchObject({ from: "Pending", to: "Paid" });
  });

  it("keeps the original paidAt when moving away from and back to Paid", async () => {
    actAs(OWNER);
    const id = await createTestEntry({ status: "Pending" });
    await updateMonetizationEntryStatusAction(SLUG, id, "Paid");
    const afterFirstPaid = await prisma.monetizationEntry.findUniqueOrThrow({ where: { id } });

    await updateMonetizationEntryStatusAction(SLUG, id, "Pending");
    await updateMonetizationEntryStatusAction(SLUG, id, "Paid");
    const afterSecondPaid = await prisma.monetizationEntry.findUniqueOrThrow({ where: { id } });

    expect(afterSecondPaid.paidAt?.toISOString()).toBe(afterFirstPaid.paidAt?.toISOString());
  });

  it("rejects transitioning to the same status", async () => {
    actAs(OWNER);
    const id = await createTestEntry({ status: "Pending" });

    const result = await updateMonetizationEntryStatusAction(SLUG, id, "Pending");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids an Admin from changing status", async () => {
    actAs(OWNER);
    const id = await createTestEntry();
    actAs(ADMIN);

    const result = await updateMonetizationEntryStatusAction(SLUG, id, "Paid");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("deleteMonetizationEntryAction", () => {
  it("deletes the entry and records an audit log with a snapshot of what was deleted", async () => {
    actAs(OWNER);
    const id = await createTestEntry();

    const result = await deleteMonetizationEntryAction(SLUG, id);

    expect(result).toMatchObject({ ok: true, data: { id } });
    const row = await prisma.monetizationEntry.findUnique({ where: { id } });
    expect(row).toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { workspaceId: WORKSPACE_ID, action: "MonetizationEntryDeleted" } });
    expect(audits.some((a) => (a.metadata as { title?: string } | null)?.title === "Test entry")).toBe(true);
  });

  it("blocks deleting another workspace's entry", async () => {
    actAs(OWNER);
    const foreignId = await createTestEntry({ workspaceId: OTHER_WORKSPACE_ID });

    const result = await deleteMonetizationEntryAction(SLUG, foreignId);

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("forbids an Admin from deleting", async () => {
    actAs(OWNER);
    const id = await createTestEntry();
    actAs(ADMIN);

    const result = await deleteMonetizationEntryAction(SLUG, id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("getMonetizationEntriesAction", () => {
  it("is readable by any workspace member, including an Admin without manageMonetization", async () => {
    actAs(OWNER);
    await createTestEntry();
    actAs(ADMIN);

    const result = await getMonetizationEntriesAction(SLUG, {});

    expect(result.items.length).toBeGreaterThan(0);
  });

  it("404s for a caller with no membership", async () => {
    actAs(OUTSIDER);
    await expect(getMonetizationEntriesAction(SLUG, {})).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
