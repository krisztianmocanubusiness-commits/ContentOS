import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const {
  renameAssetAction,
  moveAssetAction,
  updateAssetTagsAction,
  deleteAssetAction,
  restoreAssetAction,
  getAssetDetailAction,
} = await import("@/lib/asset-actions");

const SLUG = `test-asset-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-asset-actions-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-asset-actions-other-${randomUUID()}`;
const OTHER_SLUG = `test-asset-actions-other-${randomUUID()}`;

const OWNER = { id: `user-aa-owner-${randomUUID()}`, name: "Actions Owner", initials: "AO" };
const VIEWER = { id: `user-aa-viewer-${randomUUID()}`, name: "Actions Viewer", initials: "AV" };
const OUTSIDER = { id: `user-aa-outsider-${randomUUID()}`, name: "Actions Outsider", initials: "AU" };

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

async function createTestAsset(overrides: Partial<{ workspaceId: string; status: "Active" | "Deleted"; name: string }> = {}) {
  const id = randomUUID();
  const workspaceId = overrides.workspaceId ?? WORKSPACE_ID;
  await prisma.asset.create({
    data: {
      id,
      workspaceId,
      name: overrides.name ?? "test-asset.png",
      type: "Image",
      folder: "Uncategorized",
      tags: ["initial"],
      storageKey: `${workspaceId}/${id}/original`,
      mimeType: "image/png",
      byteSize: 100,
      status: overrides.status ?? "Active",
      deletedAt: overrides.status === "Deleted" ? new Date() : null,
    },
  });
  return id;
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Asset Actions Workspace", slug: SLUG, plan: "Free", initials: "AA" },
      { id: OTHER_WORKSPACE_ID, name: "Asset Actions Other Workspace", slug: OTHER_SLUG, plan: "Free", initials: "AX" },
    ],
  });

  for (const user of [OWNER, VIEWER, OUTSIDER]) {
    await prisma.user.create({
      data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
    });
  }

  await prisma.workspaceMembership.createMany({
    data: [
      { id: randomUUID(), userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: VIEWER.id, workspaceId: WORKSPACE_ID, role: "Viewer", status: "Active" },
      { id: randomUUID(), userId: OUTSIDER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, VIEWER.id, OUTSIDER.id] } } });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("renameAssetAction", () => {
  it("renames and records an audit log", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset();

    const result = await renameAssetAction(SLUG, assetId, "  new-name.png  ");

    expect(result).toMatchObject({ ok: true, data: { name: "new-name.png" } });
    const row = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(row.name).toBe("new-name.png");

    const audits = await prisma.auditLog.findMany({ where: { assetId, action: "AssetRenamed" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(OWNER.id);
  });

  it("rejects a blank name without writing to the database", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset();

    const result = await renameAssetAction(SLUG, assetId, "   ");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Viewer from renaming", async () => {
    actAs(VIEWER);
    const assetId = await createTestAsset();

    const result = await renameAssetAction(SLUG, assetId, "hacked.png");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("blocks renaming another workspace's asset", async () => {
    actAs(OWNER);
    const foreignId = await createTestAsset({ workspaceId: OTHER_WORKSPACE_ID });

    const result = await renameAssetAction(SLUG, foreignId, "sneaky.png");

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const assetId = await createTestAsset();

    await expect(renameAssetAction(SLUG, assetId, "x.png")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});

describe("moveAssetAction", () => {
  it("moves to a new folder and records an audit log", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset();

    const result = await moveAssetAction(SLUG, assetId, "Brand Assets");

    expect(result).toMatchObject({ ok: true, data: { folder: "Brand Assets" } });
    const audits = await prisma.auditLog.findMany({ where: { assetId, action: "AssetMoved" } });
    expect(audits).toHaveLength(1);
  });

  it("falls back to Uncategorized for a blank folder", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset();

    const result = await moveAssetAction(SLUG, assetId, "   ");

    expect(result).toMatchObject({ ok: true, data: { folder: "Uncategorized" } });
  });

  it("forbids a Viewer from moving", async () => {
    actAs(VIEWER);
    const assetId = await createTestAsset();

    const result = await moveAssetAction(SLUG, assetId, "New Folder");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("updateAssetTagsAction", () => {
  it("replaces tags, deduplicating and lowercasing", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset();

    const result = await updateAssetTagsAction(SLUG, assetId, ["Campaign", "campaign", "Hero"]);

    expect(result).toMatchObject({ ok: true, data: { tags: ["campaign", "hero"] } });
    const audits = await prisma.auditLog.findMany({ where: { assetId, action: "AssetTagsChanged" } });
    expect(audits).toHaveLength(1);
  });

  it("forbids a Viewer from editing tags", async () => {
    actAs(VIEWER);
    const assetId = await createTestAsset();

    const result = await updateAssetTagsAction(SLUG, assetId, ["nope"]);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("deleteAssetAction / restoreAssetAction", () => {
  it("soft-deletes an asset, hiding it without removing the row", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset();

    const result = await deleteAssetAction(SLUG, assetId);

    expect(result).toMatchObject({ ok: true });
    const row = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(row.status).toBe("Deleted");
    expect(row.deletedAt).not.toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { assetId, action: "AssetDeleted" } });
    expect(audits).toHaveLength(1);
  });

  it("rejects deleting an already-deleted asset", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset({ status: "Deleted" });

    const result = await deleteAssetAction(SLUG, assetId);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Viewer from deleting", async () => {
    actAs(VIEWER);
    const assetId = await createTestAsset();

    const result = await deleteAssetAction(SLUG, assetId);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const row = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(row.status).toBe("Active");
  });

  it("restores a deleted asset and records an audit log", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset({ status: "Deleted" });

    const result = await restoreAssetAction(SLUG, assetId);

    expect(result).toMatchObject({ ok: true });
    const row = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(row.status).toBe("Active");
    expect(row.deletedAt).toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { assetId, action: "AssetRestored" } });
    expect(audits).toHaveLength(1);
  });

  it("rejects restoring an asset that isn't deleted", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset({ status: "Active" });

    const result = await restoreAssetAction(SLUG, assetId);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("blocks deleting another workspace's asset", async () => {
    actAs(OWNER);
    const foreignId = await createTestAsset({ workspaceId: OTHER_WORKSPACE_ID });

    const result = await deleteAssetAction(SLUG, foreignId);

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("getAssetDetailAction", () => {
  it("returns the asset detail for a member of the workspace", async () => {
    actAs(OWNER);
    const assetId = await createTestAsset({ name: "detail-me.png" });

    const detail = await getAssetDetailAction(SLUG, assetId);

    expect(detail?.name).toBe("detail-me.png");
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const assetId = await createTestAsset();

    await expect(getAssetDetailAction(SLUG, assetId)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
