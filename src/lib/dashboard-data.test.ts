import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const { ContentStatus: DbContentStatus, AuditAction } = await import("@/generated/prisma/enums");
const { getDashboardData } = await import("@/lib/dashboard-data");

const SLUG = `test-dashboard-${randomUUID()}`;
const WORKSPACE_ID = `ws-dash-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-dash-other-${randomUUID()}`;
const OTHER_SLUG = `test-dashboard-other-${randomUUID()}`;

const OWNER = { id: `user-dash-owner-${randomUUID()}`, name: "Dash Owner", initials: "DO" };
const EDITOR = { id: `user-dash-editor-${randomUUID()}`, name: "Dash Editor", initials: "DE" };

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function createContentItem(status: (typeof DbContentStatus)[keyof typeof DbContentStatus], workspaceId: string) {
  return prisma.contentItem.create({
    data: {
      id: randomUUID(),
      workspaceId,
      title: `Item ${randomUUID().slice(0, 8)}`,
      status,
      platform: "Instagram",
      scheduledAt: new Date(),
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
      { id: WORKSPACE_ID, name: "Dash Test Workspace", slug: SLUG, plan: "Free", initials: "DW" },
      { id: OTHER_WORKSPACE_ID, name: "Dash Other Workspace", slug: OTHER_SLUG, plan: "Free", initials: "DO" },
    ],
  });

  for (const user of [OWNER, EDITOR]) {
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
      { id: randomUUID(), userId: EDITOR.id, workspaceId: WORKSPACE_ID, role: "Editor", status: "Active" },
    ],
  });

  // Content across every status, in this workspace.
  const draft = await createContentItem(DbContentStatus.Draft, WORKSPACE_ID);
  await createContentItem(DbContentStatus.NeedsReview, WORKSPACE_ID);
  const needsReview2 = await createContentItem(DbContentStatus.NeedsReview, WORKSPACE_ID);
  await createContentItem(DbContentStatus.Scheduled, WORKSPACE_ID);
  await createContentItem(DbContentStatus.Published, WORKSPACE_ID);

  // Content in a different workspace — must never leak into this workspace's numbers.
  await createContentItem(DbContentStatus.Draft, OTHER_WORKSPACE_ID);
  await createContentItem(DbContentStatus.NeedsReview, OTHER_WORKSPACE_ID);

  // Audit log: one entry by OWNER, one by EDITOR, scoped to this workspace.
  await prisma.auditLog.createMany({
    data: [
      {
        id: randomUUID(),
        workspaceId: WORKSPACE_ID,
        contentItemId: draft.id,
        actorId: OWNER.id,
        actorName: OWNER.name,
        action: AuditAction.ContentCommented,
      },
      {
        id: randomUUID(),
        workspaceId: WORKSPACE_ID,
        contentItemId: needsReview2.id,
        actorId: EDITOR.id,
        actorName: EDITOR.name,
        action: AuditAction.ContentSubmitted,
      },
    ],
  });

  // Audit log entry in the other workspace — must never leak in either.
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      workspaceId: OTHER_WORKSPACE_ID,
      actorId: OWNER.id,
      actorName: OWNER.name,
      action: AuditAction.ContentApproved,
    },
  });

  // Calendar events: one in the future (should show), one in the past
  // (should not), one in the other workspace (should not leak).
  await prisma.calendarEvent.createMany({
    data: [
      { id: randomUUID(), workspaceId: WORKSPACE_ID, title: "Future post", platform: "X", scheduledAt: daysFromNow(3) },
      { id: randomUUID(), workspaceId: WORKSPACE_ID, title: "Past post", platform: "X", scheduledAt: daysFromNow(-3) },
      { id: randomUUID(), workspaceId: OTHER_WORKSPACE_ID, title: "Other workspace post", platform: "X", scheduledAt: daysFromNow(3) },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, EDITOR.id] } } });
  await prisma.$disconnect();
});

describe("getDashboardData", () => {
  it("tallies content status counts scoped to the workspace", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.statusCounts).toEqual({
      total: 5,
      draft: 1,
      needsReview: 2,
      scheduled: 1,
      published: 1,
    });
  });

  it("only returns pending approvals with Needs Review status", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.pendingApprovals).toHaveLength(2);
    for (const item of data.pendingApprovals) {
      expect(item.status).toBe("Needs Review");
    }
  });

  it("builds a recent-activity feed scoped to the workspace, most recent first", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.recentActivity).toHaveLength(2);
    expect(data.recentActivity.map((e) => e.actorName).sort()).toEqual(
      [OWNER.name, EDITOR.name].sort()
    );
  });

  it("excludes the current user's own actions from notifications", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].actorName).toBe(EDITOR.name);
  });

  it("lists every team member with their last-active timestamp, or none", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.team).toHaveLength(2);
    const owner = data.team.find((m) => m.id === OWNER.id);
    const editor = data.team.find((m) => m.id === EDITOR.id);
    expect(owner?.lastActive).not.toBeNull();
    expect(editor?.lastActive).not.toBeNull();
  });

  it("reports workspace statistics scoped to this workspace", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.workspaceStats.teamMemberCount).toBe(2);
    expect(data.workspaceStats.totalContent).toBe(5);
  });

  it("only returns future calendar events, scoped to the workspace", async () => {
    const data = await getDashboardData(WORKSPACE_ID, OWNER.id);

    expect(data.upcomingEvents).toHaveLength(1);
    expect(data.upcomingEvents[0].title).toBe("Future post");
  });

  it("never leaks another workspace's data", async () => {
    const data = await getDashboardData(OTHER_WORKSPACE_ID, OWNER.id);

    expect(data.statusCounts.total).toBe(2);
    expect(data.team).toHaveLength(0);
    expect(data.upcomingEvents).toHaveLength(1);
    expect(data.upcomingEvents[0].title).toBe("Other workspace post");
  });
});
