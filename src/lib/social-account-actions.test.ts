import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const {
  connectAccountAction,
  disconnectAccountAction,
  reconnectAccountAction,
  renameAccountAction,
  simulateConnectionIssueAction,
  getAccountDetailAction,
} = await import("@/lib/social-account-actions");

const SLUG = `test-social-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-social-actions-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-social-actions-other-${randomUUID()}`;

const OWNER = { id: `user-sa-owner-${randomUUID()}`, name: "Social Owner", initials: "SO" };
const MANAGER = { id: `user-sa-manager-${randomUUID()}`, name: "Social Manager", initials: "SM" };
const OUTSIDER = { id: `user-sa-outsider-${randomUUID()}`, name: "Social Outsider", initials: "SX" };

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

async function createTestAccount(
  overrides: Partial<{
    workspaceId: string;
    status: "Connected" | "NotConnected" | "NeedsReauth";
    tokenExpiresAt: Date | null;
    connectedSince: Date | null;
  }> = {}
) {
  const id = randomUUID();
  await prisma.socialAccount.create({
    data: {
      id,
      workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
      platform: "Instagram",
      handle: "@test",
      displayName: "Test Account",
      followersLabel: "0",
      status: overrides.status ?? "Connected",
      scopes: overrides.status === "NotConnected" ? [] : ["read_posts"],
      tokenExpiresAt: overrides.tokenExpiresAt ?? (overrides.status === "NotConnected" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      connectedSince: overrides.connectedSince ?? (overrides.status === "NotConnected" ? null : new Date("2025-01-01")),
      lastSyncedAt: overrides.status === "NotConnected" ? null : new Date(),
    },
  });
  return id;
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Social Actions Workspace", slug: SLUG, plan: "Free", initials: "SA" },
      { id: OTHER_WORKSPACE_ID, name: "Social Actions Other Workspace", slug: `${SLUG}-other`, plan: "Free", initials: "SX" },
    ],
  });

  for (const user of [OWNER, MANAGER, OUTSIDER]) {
    await prisma.user.create({
      data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
    });
  }

  await prisma.workspaceMembership.createMany({
    data: [
      { id: randomUUID(), userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: MANAGER.id, workspaceId: WORKSPACE_ID, role: "Manager", status: "Active" },
      { id: randomUUID(), userId: OUTSIDER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, MANAGER.id, OUTSIDER.id] } } });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("connectAccountAction", () => {
  it("creates a Connected account with simulated scopes/token and records an audit log", async () => {
    actAs(OWNER);

    const result = await connectAccountAction(SLUG, { platform: "TikTok", handle: "@new-account" });

    expect(result).toMatchObject({ ok: true, data: { platform: "TikTok", handle: "@new-account", status: "Connected" } });
    if (!result.ok) throw new Error("expected ok");

    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: result.data.id } });
    expect(row.status).toBe("Connected");
    expect(row.scopes.length).toBeGreaterThan(0);
    expect(row.tokenExpiresAt).not.toBeNull();
    expect(row.displayName).toBe("@new-account");

    const audits = await prisma.auditLog.findMany({ where: { socialAccountId: row.id, action: "SocialAccountConnected" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(OWNER.id);
  });

  it("uses a provided display name instead of defaulting to the handle", async () => {
    actAs(OWNER);
    const result = await connectAccountAction(SLUG, { platform: "LinkedIn", handle: "@x", displayName: "My Company" });
    expect(result).toMatchObject({ ok: true, data: { displayName: "My Company" } });
  });

  it("rejects a blank handle", async () => {
    actAs(OWNER);
    const result = await connectAccountAction(SLUG, { platform: "Instagram", handle: "   " });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("rejects an invalid platform", async () => {
    actAs(OWNER);
    const result = await connectAccountAction(SLUG, { platform: "Snapchat", handle: "@x" });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Manager from connecting (manageSocialAccounts is Owner/Admin only)", async () => {
    actAs(MANAGER);
    const result = await connectAccountAction(SLUG, { platform: "Instagram", handle: "@blocked" });
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    await expect(connectAccountAction(SLUG, { platform: "Instagram", handle: "@x" })).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});

describe("disconnectAccountAction", () => {
  it("disconnects a Connected account, clearing token/scope/date fields, and records an audit log", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "Connected" });

    const result = await disconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: true, data: { status: "NotConnected" } });
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(row.scopes).toEqual([]);
    expect(row.tokenExpiresAt).toBeNull();
    expect(row.connectedSince).toBeNull();
    expect(row.lastSyncedAt).toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { socialAccountId: accountId, action: "SocialAccountDisconnected" } });
    expect(audits).toHaveLength(1);
  });

  it("disconnects a NeedsReauth account too", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "NeedsReauth" });

    const result = await disconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: true });
  });

  it("rejects disconnecting an already-disconnected account", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "NotConnected" });

    const result = await disconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Manager from disconnecting", async () => {
    actAs(MANAGER);
    const accountId = await createTestAccount({ status: "Connected" });

    const result = await disconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(row.status).toBe("Connected");
  });

  it("blocks disconnecting another workspace's account", async () => {
    actAs(OWNER);
    const foreignId = await createTestAccount({ workspaceId: OTHER_WORKSPACE_ID, status: "Connected" });

    const result = await disconnectAccountAction(SLUG, foreignId);

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("reconnectAccountAction", () => {
  it("reconnects a NotConnected account as a fresh connection", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "NotConnected" });

    const result = await reconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: true, data: { status: "Connected" } });
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(row.scopes.length).toBeGreaterThan(0);
    expect(row.tokenExpiresAt).not.toBeNull();
    expect(row.connectedSince).not.toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { socialAccountId: accountId, action: "SocialAccountReconnected" } });
    expect(audits).toHaveLength(1);
  });

  it("reconnecting a NeedsReauth account preserves its original connectedSince", async () => {
    actAs(OWNER);
    const originalDate = new Date("2024-06-01");
    const accountId = await createTestAccount({ status: "NeedsReauth", connectedSince: originalDate });

    const result = await reconnectAccountAction(SLUG, accountId);

    expect(result.ok).toBe(true);
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(row.connectedSince?.toISOString()).toBe(originalDate.toISOString());
  });

  it("rejects reconnecting an already-connected account", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "Connected" });

    const result = await reconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Manager from reconnecting", async () => {
    actAs(MANAGER);
    const accountId = await createTestAccount({ status: "NotConnected" });

    const result = await reconnectAccountAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("renameAccountAction", () => {
  it("renames and records an audit log", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount();

    const result = await renameAccountAction(SLUG, accountId, "  New Display Name  ");

    expect(result).toMatchObject({ ok: true, data: { displayName: "New Display Name" } });
    const audits = await prisma.auditLog.findMany({ where: { socialAccountId: accountId, action: "SocialAccountRenamed" } });
    expect(audits).toHaveLength(1);
  });

  it("rejects a blank name", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount();

    const result = await renameAccountAction(SLUG, accountId, "   ");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Manager from renaming", async () => {
    actAs(MANAGER);
    const accountId = await createTestAccount();

    const result = await renameAccountAction(SLUG, accountId, "Hacked");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("simulateConnectionIssueAction", () => {
  it("flips a Connected account to NeedsReauth and records an audit log", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "Connected" });

    const result = await simulateConnectionIssueAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: true, data: { status: "NeedsReauth" } });
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(row.status).toBe("NeedsReauth");

    const audits = await prisma.auditLog.findMany({ where: { socialAccountId: accountId, action: "SocialAccountStatusChanged" } });
    expect(audits).toHaveLength(1);
  });

  it("rejects flagging an account that isn't Connected", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount({ status: "NotConnected" });

    const result = await simulateConnectionIssueAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Manager from simulating a connection issue", async () => {
    actAs(MANAGER);
    const accountId = await createTestAccount({ status: "Connected" });

    const result = await simulateConnectionIssueAction(SLUG, accountId);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("getAccountDetailAction", () => {
  it("returns the account detail for a member of the workspace", async () => {
    actAs(OWNER);
    const accountId = await createTestAccount();

    const detail = await getAccountDetailAction(SLUG, accountId);

    expect(detail?.id).toBe(accountId);
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const accountId = await createTestAccount();

    await expect(getAccountDetailAction(SLUG, accountId)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
