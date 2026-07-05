import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const { getWorkspaceSocialAccounts, getSocialAccountDetail, getConnectionHealth } = await import(
  "@/lib/social-account-data"
);

const WORKSPACE_ID = `ws-social-data-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-social-data-other-${randomUUID()}`;

const CONNECTED_ID = randomUUID();
const NOT_CONNECTED_ID = randomUUID();
const OTHER_ACCOUNT_ID = randomUUID();

async function createContentItem(opts: { workspaceId: string; platform: string; status: string; scheduledAt: Date; title: string }) {
  return prisma.contentItem.create({
    data: {
      id: randomUUID(),
      workspaceId: opts.workspaceId,
      title: opts.title,
      status: opts.status as never,
      platform: opts.platform as never,
      scheduledAt: opts.scheduledAt,
      authorName: "Author",
      authorInitials: "AU",
      body: "Body",
      tags: [],
    },
  });
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Social Data Workspace", slug: `sd-${randomUUID()}`, plan: "Free", initials: "SD" },
      { id: OTHER_WORKSPACE_ID, name: "Social Data Other Workspace", slug: `sd-other-${randomUUID()}`, plan: "Free", initials: "SX" },
    ],
  });

  await prisma.socialAccount.createMany({
    data: [
      {
        id: CONNECTED_ID,
        workspaceId: WORKSPACE_ID,
        platform: "Instagram",
        handle: "@keris",
        displayName: "Keris",
        followersLabel: "212K",
        status: "Connected",
        scopes: ["read_posts"],
        tokenExpiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        connectedSince: new Date("2024-01-01"),
        lastSyncedAt: new Date(),
      },
      {
        id: NOT_CONNECTED_ID,
        workspaceId: WORKSPACE_ID,
        platform: "X",
        handle: "@keris",
        displayName: "Keris",
        followersLabel: "12K",
        status: "NotConnected",
        scopes: [],
        tokenExpiresAt: null,
        connectedSince: null,
        lastSyncedAt: null,
      },
      {
        id: OTHER_ACCOUNT_ID,
        workspaceId: OTHER_WORKSPACE_ID,
        platform: "Instagram",
        handle: "@other",
        displayName: "Other",
        followersLabel: "1K",
        status: "Connected",
        scopes: [],
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        connectedSince: new Date(),
        lastSyncedAt: new Date(),
      },
    ],
  });

  // Matches platform + Published/Scheduled -> should appear in recent posts.
  await createContentItem({ workspaceId: WORKSPACE_ID, platform: "Instagram", status: "Published", scheduledAt: new Date("2026-01-01"), title: "Older post" });
  await createContentItem({ workspaceId: WORKSPACE_ID, platform: "Instagram", status: "Scheduled", scheduledAt: new Date("2026-06-01"), title: "Newer post" });
  // Wrong platform -> must not appear.
  await createContentItem({ workspaceId: WORKSPACE_ID, platform: "TikTok", status: "Published", scheduledAt: new Date(), title: "Wrong platform" });
  // Right platform, Draft status -> must not appear.
  await createContentItem({ workspaceId: WORKSPACE_ID, platform: "Instagram", status: "Draft", scheduledAt: new Date(), title: "Still a draft" });
  // Other workspace's matching content -> must never leak in.
  await createContentItem({ workspaceId: OTHER_WORKSPACE_ID, platform: "Instagram", status: "Published", scheduledAt: new Date(), title: "Not yours" });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.$disconnect();
});

describe("getConnectionHealth", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("is Disconnected for NotConnected regardless of token expiry", () => {
    expect(getConnectionHealth("NotConnected", null, now)).toBe("Disconnected");
    expect(getConnectionHealth("NotConnected", new Date("2027-01-01"), now)).toBe("Disconnected");
  });

  it("is Expired for NeedsReauth regardless of token expiry", () => {
    expect(getConnectionHealth("NeedsReauth", new Date("2027-01-01"), now)).toBe("Expired");
    expect(getConnectionHealth("NeedsReauth", null, now)).toBe("Expired");
  });

  it("is Healthy for Connected with no token expiry set", () => {
    expect(getConnectionHealth("Connected", null, now)).toBe("Healthy");
  });

  it("is Healthy for Connected with a far-out expiry", () => {
    const farOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(getConnectionHealth("Connected", farOut, now)).toBe("Healthy");
  });

  it("is ExpiringSoon for Connected within the 7-day window", () => {
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(getConnectionHealth("Connected", soon, now)).toBe("ExpiringSoon");
  });

  it("is Expired for Connected with a lapsed token", () => {
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(getConnectionHealth("Connected", past, now)).toBe("Expired");
  });
});

describe("getWorkspaceSocialAccounts", () => {
  it("returns the workspace's accounts with computed health", async () => {
    const rows = await getWorkspaceSocialAccounts(WORKSPACE_ID);
    expect(rows.map((r) => r.id).sort()).toEqual([CONNECTED_ID, NOT_CONNECTED_ID].sort());

    const connected = rows.find((r) => r.id === CONNECTED_ID);
    expect(connected?.health).toBe("Healthy");
    expect(connected?.connectedSinceLabel).toBe("Jan 2024");

    const notConnected = rows.find((r) => r.id === NOT_CONNECTED_ID);
    expect(notConnected?.health).toBe("Disconnected");
    expect(notConnected?.connectedSinceLabel).toBeNull();
  });

  it("never returns another workspace's accounts", async () => {
    const rows = await getWorkspaceSocialAccounts(WORKSPACE_ID);
    expect(rows.some((r) => r.id === OTHER_ACCOUNT_ID)).toBe(false);
  });
});

describe("getSocialAccountDetail", () => {
  it("lists recent Published/Scheduled posts on the same platform, newest first", async () => {
    const detail = await getSocialAccountDetail(WORKSPACE_ID, CONNECTED_ID);
    expect(detail?.recentPosts.map((p) => p.title)).toEqual(["Newer post", "Older post"]);
  });

  it("excludes other platforms, Draft content, and another workspace's content", async () => {
    const detail = await getSocialAccountDetail(WORKSPACE_ID, CONNECTED_ID);
    const titles = detail?.recentPosts.map((p) => p.title) ?? [];
    expect(titles).not.toContain("Wrong platform");
    expect(titles).not.toContain("Still a draft");
    expect(titles).not.toContain("Not yours");
  });

  it("returns null for another workspace's account", async () => {
    const detail = await getSocialAccountDetail(WORKSPACE_ID, OTHER_ACCOUNT_ID);
    expect(detail).toBeNull();
  });
});
