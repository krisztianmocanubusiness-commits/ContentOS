import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const { ContentStatus: DbContentStatus } = await import("@/generated/prisma/enums");
const {
  addCommentAction,
  approveContentAction,
  requestChangesAction,
  submitForReviewAction,
} = await import("@/lib/content-actions");

const SLUG = `test-content-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-other-${randomUUID()}`;
const OTHER_SLUG = `test-other-${randomUUID()}`;

const OWNER = { id: `user-owner-${randomUUID()}`, name: "Owner Test", initials: "OT" };
const MANAGER = { id: `user-manager-${randomUUID()}`, name: "Manager Test", initials: "MT" };
const EDITOR = { id: `user-editor-${randomUUID()}`, name: "Editor Test", initials: "ET" };
const MODERATOR = { id: `user-moderator-${randomUUID()}`, name: "Moderator Test", initials: "OT2" };
const ANALYST = { id: `user-analyst-${randomUUID()}`, name: "Analyst Test", initials: "AT" };
const VIEWER = { id: `user-viewer-${randomUUID()}`, name: "Viewer Test", initials: "VT" };
const OUTSIDER = { id: `user-outsider-${randomUUID()}`, name: "Outsider Test", initials: "OU" };

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

async function createContentItem(
  status: (typeof DbContentStatus)[keyof typeof DbContentStatus],
  workspaceId: string = WORKSPACE_ID
) {
  return prisma.contentItem.create({
    data: {
      id: randomUUID(),
      workspaceId,
      title: "Test content",
      status,
      platform: "Instagram",
      scheduledAt: new Date(),
      authorName: "Author",
      authorInitials: "AU",
      body: "Body text",
      tags: [],
    },
  });
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Test Workspace", slug: SLUG, plan: "Free", initials: "TW" },
      { id: OTHER_WORKSPACE_ID, name: "Other Workspace", slug: OTHER_SLUG, plan: "Free", initials: "OW" },
    ],
  });

  for (const user of [OWNER, MANAGER, EDITOR, MODERATOR, ANALYST, VIEWER, OUTSIDER]) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: `${user.id}@test.local`,
        passwordHash: "not-a-real-hash",
        initials: user.initials,
      },
    });
  }

  await prisma.workspaceMembership.createMany({
    data: [
      { id: randomUUID(), userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: MANAGER.id, workspaceId: WORKSPACE_ID, role: "Manager", status: "Active" },
      { id: randomUUID(), userId: EDITOR.id, workspaceId: WORKSPACE_ID, role: "Editor", status: "Active" },
      { id: randomUUID(), userId: MODERATOR.id, workspaceId: WORKSPACE_ID, role: "Moderator", status: "Active" },
      { id: randomUUID(), userId: ANALYST.id, workspaceId: WORKSPACE_ID, role: "Analyst", status: "Active" },
      { id: randomUUID(), userId: VIEWER.id, workspaceId: WORKSPACE_ID, role: "Viewer", status: "Active" },
      { id: randomUUID(), userId: OUTSIDER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({
    where: {
      id: { in: [OWNER.id, MANAGER.id, EDITOR.id, MODERATOR.id, ANALYST.id, VIEWER.id, OUTSIDER.id] },
    },
  });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("addCommentAction", () => {
  it("lets any workspace member comment and records an audit log", async () => {
    actAs(VIEWER);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await addCommentAction(SLUG, item.id, "  Looks great!  ");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.data.body).toBe("Looks great!");
    expect(result.data.author).toBe(VIEWER.name);

    const comments = await prisma.contentComment.findMany({ where: { contentItemId: item.id } });
    expect(comments).toHaveLength(1);

    const audits = await prisma.auditLog.findMany({
      where: { contentItemId: item.id, action: "ContentCommented" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(VIEWER.id);
  });

  it("rejects a blank comment without writing to the database", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await addCommentAction(SLUG, item.id, "   ");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
    const comments = await prisma.contentComment.findMany({ where: { contentItemId: item.id } });
    expect(comments).toHaveLength(0);
  });

  it("rejects a comment over the length limit", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await addCommentAction(SLUG, item.id, "x".repeat(2001));

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("blocks commenting on content that belongs to a different workspace", async () => {
    actAs(OWNER);
    const foreignItem = await createContentItem(DbContentStatus.Draft, OTHER_WORKSPACE_ID);

    const result = await addCommentAction(SLUG, foreignItem.id, "Sneaky comment");

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const item = await createContentItem(DbContentStatus.Draft);

    await expect(addCommentAction(SLUG, item.id, "hi")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});

describe("submitForReviewAction", () => {
  it("moves a Draft to Needs Review for a role that can create content", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await submitForReviewAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: true, data: { status: "Needs Review" } });

    const updated = await prisma.contentItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.status).toBe("NeedsReview");

    const events = await prisma.reviewEvent.findMany({ where: { contentItemId: item.id } });
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe("submitted");

    const audits = await prisma.auditLog.findMany({
      where: { contentItemId: item.id, action: "ContentSubmitted" },
    });
    expect(audits).toHaveLength(1);
  });

  it("forbids a Viewer from submitting", async () => {
    actAs(VIEWER);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await submitForReviewAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const updated = await prisma.contentItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.status).toBe("Draft");
  });

  it("forbids an Analyst from submitting", async () => {
    actAs(ANALYST);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await submitForReviewAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("lets a Moderator submit (createContent only, no publish/approve)", async () => {
    actAs(MODERATOR);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await submitForReviewAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: true, data: { status: "Needs Review" } });
  });

  it("lets a Manager submit", async () => {
    actAs(MANAGER);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await submitForReviewAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: true, data: { status: "Needs Review" } });
  });

  it("reports a conflict when the item is no longer a Draft", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await submitForReviewAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: false, code: "conflict" });
  });

  it("lets only one of two concurrent submits win", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.Draft);

    const [a, b] = await Promise.all([
      submitForReviewAction(SLUG, item.id),
      submitForReviewAction(SLUG, item.id),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const events = await prisma.reviewEvent.findMany({ where: { contentItemId: item.id } });
    expect(events).toHaveLength(1);
  });
});

describe("approveContentAction", () => {
  it("moves Needs Review to Scheduled for a role that can approve", async () => {
    actAs(OWNER);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await approveContentAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: true, data: { status: "Scheduled" } });
    const audits = await prisma.auditLog.findMany({
      where: { contentItemId: item.id, action: "ContentApproved" },
    });
    expect(audits).toHaveLength(1);
  });

  it("forbids an Editor from approving", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await approveContentAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("forbids a Moderator from approving", async () => {
    actAs(MODERATOR);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await approveContentAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("lets a Manager approve", async () => {
    actAs(MANAGER);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await approveContentAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: true, data: { status: "Scheduled" } });
  });

  it("reports a conflict when the item is no longer in review", async () => {
    actAs(OWNER);
    const item = await createContentItem(DbContentStatus.Draft);

    const result = await approveContentAction(SLUG, item.id);

    expect(result).toMatchObject({ ok: false, code: "conflict" });
  });
});

describe("requestChangesAction", () => {
  it("sends Needs Review back to Draft with a note", async () => {
    actAs(OWNER);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await requestChangesAction(SLUG, item.id, "Please fix the caption");

    expect(result).toMatchObject({ ok: true, data: { status: "Draft" } });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.data.reviewEvent.note).toBe("Please fix the caption");

    const audits = await prisma.auditLog.findMany({
      where: { contentItemId: item.id, action: "ContentChangesRequested" },
    });
    expect(audits).toHaveLength(1);
    expect((audits[0].metadata as { note?: string } | null)?.note).toBe("Please fix the caption");
  });

  it("rejects an empty reason", async () => {
    actAs(OWNER);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await requestChangesAction(SLUG, item.id, "   ");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids an Editor from requesting changes", async () => {
    actAs(EDITOR);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await requestChangesAction(SLUG, item.id, "Fix the title");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("forbids a Moderator from requesting changes", async () => {
    actAs(MODERATOR);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await requestChangesAction(SLUG, item.id, "Fix the title");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("lets a Manager request changes", async () => {
    actAs(MANAGER);
    const item = await createContentItem(DbContentStatus.NeedsReview);

    const result = await requestChangesAction(SLUG, item.id, "Fix the title");

    expect(result).toMatchObject({ ok: true, data: { status: "Draft" } });
  });
});
