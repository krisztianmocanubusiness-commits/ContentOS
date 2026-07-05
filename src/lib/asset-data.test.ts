import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const { getWorkspaceAssets, getWorkspaceFolders, getWorkspaceAssetTags, getAssetDetail, requireAssetFileAccess, createAssetRecord } =
  await import("@/lib/asset-data");

const WORKSPACE_ID = `ws-asset-data-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-asset-data-other-${randomUUID()}`;

const OWNER = { id: `user-ad-owner-${randomUUID()}`, name: "Data Owner", initials: "DO" };
const OUTSIDER = { id: `user-ad-outsider-${randomUUID()}`, name: "Data Outsider", initials: "DX" };

const IMAGE_ID = randomUUID();
const VIDEO_ID = randomUUID();
const DELETED_ID = randomUUID();
const OTHER_ASSET_ID = randomUUID();
const CONTENT_ID = randomUUID();

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Asset Data Workspace", slug: `ad-${randomUUID()}`, plan: "Free", initials: "AD" },
      { id: OTHER_WORKSPACE_ID, name: "Asset Data Other Workspace", slug: `ad-other-${randomUUID()}`, plan: "Free", initials: "AX" },
    ],
  });

  for (const user of [OWNER, OUTSIDER]) {
    await prisma.user.create({
      data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
    });
  }
  await prisma.workspaceMembership.create({
    data: { id: randomUUID(), userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
  });

  await prisma.contentItem.create({
    data: {
      id: CONTENT_ID,
      workspaceId: WORKSPACE_ID,
      title: "Uses the logo",
      status: "Draft",
      platform: "Instagram",
      scheduledAt: new Date(),
      authorName: "Author",
      authorInitials: "AU",
      body: "Body",
      tags: [],
    },
  });

  await prisma.asset.createMany({
    data: [
      {
        id: IMAGE_ID,
        workspaceId: WORKSPACE_ID,
        name: "hero-image.png",
        type: "Image",
        folder: "Brand",
        tags: ["hero", "campaign"],
        storageKey: `${WORKSPACE_ID}/${IMAGE_ID}/original`,
        thumbnailKey: `${WORKSPACE_ID}/${IMAGE_ID}/thumbnail.webp`,
        mimeType: "image/png",
        byteSize: 1024,
        status: "Active",
      },
      {
        id: VIDEO_ID,
        workspaceId: WORKSPACE_ID,
        name: "demo-video.mp4",
        type: "Video",
        folder: "Demos",
        tags: ["demo"],
        storageKey: `${WORKSPACE_ID}/${VIDEO_ID}/original`,
        mimeType: "video/mp4",
        byteSize: 2048,
        status: "Active",
      },
      {
        id: DELETED_ID,
        workspaceId: WORKSPACE_ID,
        name: "old-file.pdf",
        type: "Document",
        folder: "Archive",
        tags: [],
        storageKey: `${WORKSPACE_ID}/${DELETED_ID}/original`,
        mimeType: "application/pdf",
        byteSize: 512,
        status: "Deleted",
        deletedAt: new Date(),
      },
      {
        id: OTHER_ASSET_ID,
        workspaceId: OTHER_WORKSPACE_ID,
        name: "not-yours.png",
        type: "Image",
        folder: "Brand",
        tags: [],
        storageKey: `${OTHER_WORKSPACE_ID}/${OTHER_ASSET_ID}/original`,
        mimeType: "image/png",
        byteSize: 999,
        status: "Active",
      },
    ],
  });

  await prisma.contentItem.update({
    where: { id: CONTENT_ID },
    data: { assets: { connect: { id: IMAGE_ID } } },
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, OUTSIDER.id] } } });
  await prisma.$disconnect();
});

describe("getWorkspaceAssets", () => {
  it("returns only Active assets for the workspace by default", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID);
    expect(rows.map((r) => r.id).sort()).toEqual([IMAGE_ID, VIDEO_ID].sort());
  });

  it("filters by type", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID, { type: "Video" });
    expect(rows.map((r) => r.id)).toEqual([VIDEO_ID]);
  });

  it("filters by folder", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID, { folder: "Demos" });
    expect(rows.map((r) => r.id)).toEqual([VIDEO_ID]);
  });

  it("filters by tag", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID, { tag: "campaign" });
    expect(rows.map((r) => r.id)).toEqual([IMAGE_ID]);
  });

  it("filters by case-insensitive search on name", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID, { search: "HERO" });
    expect(rows.map((r) => r.id)).toEqual([IMAGE_ID]);
  });

  it("returns Deleted assets only when explicitly asked", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID, { status: "Deleted" });
    expect(rows.map((r) => r.id)).toEqual([DELETED_ID]);
  });

  it("reports hasThumbnail based on thumbnailKey", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID);
    expect(rows.find((r) => r.id === IMAGE_ID)?.hasThumbnail).toBe(true);
    expect(rows.find((r) => r.id === VIDEO_ID)?.hasThumbnail).toBe(false);
  });

  it("reports usedInCount from the ContentItem relation", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID);
    expect(rows.find((r) => r.id === IMAGE_ID)?.usedInCount).toBe(1);
    expect(rows.find((r) => r.id === VIDEO_ID)?.usedInCount).toBe(0);
  });

  it("never returns another workspace's assets", async () => {
    const rows = await getWorkspaceAssets(WORKSPACE_ID);
    expect(rows.some((r) => r.id === OTHER_ASSET_ID)).toBe(false);
  });
});

describe("getWorkspaceFolders / getWorkspaceAssetTags", () => {
  it("returns distinct Active folders, sorted", async () => {
    const folders = await getWorkspaceFolders(WORKSPACE_ID);
    expect(folders).toEqual(["Brand", "Demos"]);
  });

  it("returns distinct Active tags across assets, sorted", async () => {
    const tags = await getWorkspaceAssetTags(WORKSPACE_ID);
    expect(tags).toEqual(["campaign", "demo", "hero"]);
  });
});

describe("getAssetDetail", () => {
  it("includes the list of content items using the asset", async () => {
    const detail = await getAssetDetail(WORKSPACE_ID, IMAGE_ID);
    expect(detail?.usedIn).toEqual([{ id: CONTENT_ID, title: "Uses the logo", status: "Draft" }]);
  });

  it("returns null for another workspace's asset", async () => {
    const detail = await getAssetDetail(WORKSPACE_ID, OTHER_ASSET_ID);
    expect(detail).toBeNull();
  });
});

describe("requireAssetFileAccess", () => {
  it("returns the asset for a member of its workspace", async () => {
    actAs(OWNER);
    const asset = await requireAssetFileAccess(IMAGE_ID);
    expect(asset?.id).toBe(IMAGE_ID);
  });

  it("returns null for a caller with no membership in the asset's workspace", async () => {
    actAs(OUTSIDER);
    const asset = await requireAssetFileAccess(IMAGE_ID);
    expect(asset).toBeNull();
  });

  it("returns null for an unauthenticated caller", async () => {
    mockAuth.mockResolvedValue(null);
    const asset = await requireAssetFileAccess(IMAGE_ID);
    expect(asset).toBeNull();
  });

  it("returns null for a nonexistent asset id", async () => {
    actAs(OWNER);
    const asset = await requireAssetFileAccess(randomUUID());
    expect(asset).toBeNull();
  });
});

describe("createAssetRecord", () => {
  it("creates the Asset row and an AssetUploaded audit log in one transaction", async () => {
    const id = randomUUID();
    const row = await createAssetRecord({
      id,
      workspaceId: WORKSPACE_ID,
      actorId: OWNER.id,
      actorName: OWNER.name,
      name: "new-upload.png",
      type: "Image",
      folder: "Uncategorized",
      tags: ["fresh"],
      storageKey: `${WORKSPACE_ID}/${id}/original`,
      thumbnailKey: null,
      mimeType: "image/png",
      byteSize: 100,
    });

    expect(row.id).toBe(id);
    expect(row.name).toBe("new-upload.png");

    const audits = await prisma.auditLog.findMany({ where: { assetId: id, action: "AssetUploaded" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(OWNER.id);
  });
});
