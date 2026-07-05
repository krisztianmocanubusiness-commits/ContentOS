import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const {
  getRangeBounds,
  getContentStatusSummary,
  getContentByStatus,
  getContentByPlatform,
  getContentByTag,
  getPostingFrequency,
  getCalendarActivity,
  getReviewPipeline,
  getApprovalTurnaround,
  getReviewActivity,
  getTeamContribution,
  getWorkspaceGrowth,
} = await import("@/lib/analytics-data");

const WORKSPACE_ID = `ws-an-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-an-other-${randomUUID()}`;
const OWNER = { id: `user-an-owner-${randomUUID()}`, name: "An Owner", initials: "AO" };
const EDITOR = { id: `user-an-editor-${randomUUID()}`, name: "An Editor", initials: "AE" };

const NOW = new Date("2026-08-15T12:00:00Z");
const bounds = getRangeBounds("30d", NOW);
const inCurrent = new Date(bounds.start.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days into the window
const inPrevious = new Date(bounds.prevStart.getTime() + 5 * 24 * 60 * 60 * 1000);

async function createContentItem(opts: {
  workspaceId: string;
  status: "Draft" | "Scheduled" | "Published" | "NeedsReview";
  platform: string;
  createdAt: Date;
  scheduledAt?: Date;
  tags?: string[];
}) {
  return prisma.contentItem.create({
    data: {
      id: randomUUID(),
      workspaceId: opts.workspaceId,
      title: `Item ${randomUUID().slice(0, 6)}`,
      status: opts.status as never,
      platform: opts.platform as never,
      scheduledAt: opts.scheduledAt ?? opts.createdAt,
      authorName: "Author",
      authorInitials: "AU",
      body: "Body",
      tags: opts.tags ?? [],
      createdAt: opts.createdAt,
    },
  });
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Analytics Test Workspace", slug: `an-${randomUUID()}`, plan: "Free", initials: "AT" },
      { id: OTHER_WORKSPACE_ID, name: "Analytics Other Workspace", slug: `an-other-${randomUUID()}`, plan: "Free", initials: "AO" },
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
      { id: randomUUID(), userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active", createdAt: bounds.prevStart },
      { id: randomUUID(), userId: EDITOR.id, workspaceId: WORKSPACE_ID, role: "Editor", status: "Active", createdAt: inCurrent },
    ],
  });

  // Current-period content: Draft/Instagram, Scheduled/TikTok, Published/LinkedIn.
  const draft = await createContentItem({ workspaceId: WORKSPACE_ID, status: "Draft", platform: "Instagram", createdAt: inCurrent, tags: ["reel"] });
  await createContentItem({ workspaceId: WORKSPACE_ID, status: "Scheduled", platform: "TikTok", createdAt: inCurrent, scheduledAt: inCurrent, tags: ["reel", "ootd"] });
  await createContentItem({ workspaceId: WORKSPACE_ID, status: "Published", platform: "LinkedIn", createdAt: inCurrent });

  // Previous-period content, for trend comparisons.
  await createContentItem({ workspaceId: WORKSPACE_ID, status: "Draft", platform: "Instagram", createdAt: inPrevious });

  // Other workspace's content — must never leak into any metric above.
  const otherWorkspaceItem = await createContentItem({ workspaceId: OTHER_WORKSPACE_ID, status: "Published", platform: "X", createdAt: inCurrent });

  // Review events: a submitted -> approved pair 2 hours apart, in range.
  const submittedAt = inCurrent;
  const approvedAt = new Date(inCurrent.getTime() + 2 * 60 * 60 * 1000);
  await prisma.reviewEvent.createMany({
    data: [
      { id: randomUUID(), contentItemId: draft.id, action: "submitted", byName: EDITOR.name, byInitials: EDITOR.initials, createdAt: submittedAt },
      { id: randomUUID(), contentItemId: draft.id, action: "approved", byName: OWNER.name, byInitials: OWNER.initials, createdAt: approvedAt },
    ],
  });

  // Review event on the other workspace's content — must not leak.
  await prisma.reviewEvent.create({
    data: { id: randomUUID(), contentItemId: otherWorkspaceItem.id, action: "submitted", byName: "Nobody", byInitials: "NB", createdAt: inCurrent },
  });

  // Audit log for team contribution.
  await prisma.auditLog.createMany({
    data: [
      { id: randomUUID(), workspaceId: WORKSPACE_ID, actorId: OWNER.id, actorName: OWNER.name, action: "ContentApproved", createdAt: inCurrent },
      { id: randomUUID(), workspaceId: WORKSPACE_ID, actorId: EDITOR.id, actorName: EDITOR.name, action: "ContentCommented", createdAt: inCurrent },
      { id: randomUUID(), workspaceId: WORKSPACE_ID, actorId: EDITOR.id, actorName: EDITOR.name, action: "ContentSubmitted", createdAt: inCurrent },
      { id: randomUUID(), workspaceId: OTHER_WORKSPACE_ID, actorId: OWNER.id, actorName: OWNER.name, action: "ContentApproved", createdAt: inCurrent },
    ],
  });

  // Calendar events.
  await prisma.calendarEvent.createMany({
    data: [
      { id: randomUUID(), workspaceId: WORKSPACE_ID, title: "Current post", platform: "Instagram", scheduledAt: inCurrent },
      { id: randomUUID(), workspaceId: WORKSPACE_ID, title: "Previous post", platform: "Instagram", scheduledAt: inPrevious },
      { id: randomUUID(), workspaceId: OTHER_WORKSPACE_ID, title: "Other workspace post", platform: "Instagram", scheduledAt: inCurrent },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, EDITOR.id] } } });
  await prisma.$disconnect();
});

describe("getContentStatusSummary", () => {
  it("counts current vs previous period content by status, scoped to the workspace", async () => {
    const summary = await getContentStatusSummary(WORKSPACE_ID, bounds);
    expect(summary.total).toEqual({ current: 3, previous: 1 });
    expect(summary.draft).toEqual({ current: 1, previous: 1 });
    expect(summary.scheduled).toEqual({ current: 1, previous: 0 });
    expect(summary.published).toEqual({ current: 1, previous: 0 });
  });

  it("never counts another workspace's content", async () => {
    const summary = await getContentStatusSummary(OTHER_WORKSPACE_ID, bounds);
    expect(summary.total.current).toBe(1);
  });
});

describe("getContentByStatus / getContentByPlatform / getContentByTag", () => {
  it("breaks down current-period content correctly", async () => {
    const byStatus = await getContentByStatus(WORKSPACE_ID, bounds);
    expect(byStatus.sort((a, b) => a.label.localeCompare(b.label))).toEqual(
      [
        { label: "Draft", count: 1 },
        { label: "Published", count: 1 },
        { label: "Scheduled", count: 1 },
      ].sort((a, b) => a.label.localeCompare(b.label))
    );

    const byPlatform = await getContentByPlatform(WORKSPACE_ID, bounds);
    expect(byPlatform.find((p) => p.label === "Instagram")?.count).toBe(1);
    expect(byPlatform.find((p) => p.label === "TikTok")?.count).toBe(1);

    const byTag = await getContentByTag(WORKSPACE_ID, bounds);
    expect(byTag.find((t) => t.label === "reel")?.count).toBe(2);
    expect(byTag.find((t) => t.label === "ootd")?.count).toBe(1);
  });
});

describe("getPostingFrequency", () => {
  it("buckets scheduled posts within the window, excluding other periods and workspaces", async () => {
    const buckets = await getPostingFrequency(WORKSPACE_ID, "30d", bounds);
    const total = buckets.reduce((sum, b) => sum + b.value, 0);
    // The 3 current-period items (their scheduledAt defaults to createdAt,
    // all inCurrent) count; the previous-period item and the other
    // workspace's item do not.
    expect(total).toBe(3);
  });
});

describe("getCalendarActivity", () => {
  it("counts calendar events in the current vs previous window, scoped to the workspace", async () => {
    const activity = await getCalendarActivity(WORKSPACE_ID, bounds);
    expect(activity).toEqual({ current: 1, previous: 1 });
  });

  it("never counts another workspace's calendar events", async () => {
    const activity = await getCalendarActivity(OTHER_WORKSPACE_ID, bounds);
    expect(activity.current).toBe(1);
  });
});

describe("getReviewPipeline", () => {
  it("counts review actions by kind, scoped to the workspace's content", async () => {
    const pipeline = await getReviewPipeline(WORKSPACE_ID, bounds);
    expect(pipeline).toEqual({ submitted: 1, approved: 1, changesRequested: 0 });
  });
});

describe("getApprovalTurnaround", () => {
  it("averages the time between submission and decision", async () => {
    const turnaround = await getApprovalTurnaround(WORKSPACE_ID, bounds);
    expect(turnaround.sampleSize).toBe(1);
    expect(turnaround.averageHours).toBeCloseTo(2, 1);
  });

  it("reports no data when there are no completed review cycles", async () => {
    const turnaround = await getApprovalTurnaround(OTHER_WORKSPACE_ID, bounds);
    expect(turnaround).toEqual({ averageHours: null, sampleSize: 0 });
  });
});

describe("getReviewActivity", () => {
  it("lists review events for the workspace's content only", async () => {
    const activity = await getReviewActivity(WORKSPACE_ID, bounds);
    expect(activity).toHaveLength(2);
    expect(activity.some((e) => e.actorName === "Nobody")).toBe(false);
  });
});

describe("getTeamContribution", () => {
  it("ranks members by AuditLog action count, scoped to the workspace", async () => {
    const contribution = await getTeamContribution(WORKSPACE_ID, bounds);
    const editorEntry = contribution.find((c) => c.userId === EDITOR.id);
    const ownerEntry = contribution.find((c) => c.userId === OWNER.id);
    expect(editorEntry?.actionCount).toBe(2);
    expect(ownerEntry?.actionCount).toBe(1);
  });

  it("never counts another workspace's audit log entries", async () => {
    const contribution = await getTeamContribution(OTHER_WORKSPACE_ID, bounds);
    expect(contribution).toHaveLength(1);
    expect(contribution[0].actionCount).toBe(1);
  });
});

describe("getWorkspaceGrowth", () => {
  it("counts total and newly-joined members in the window", async () => {
    const growth = await getWorkspaceGrowth(WORKSPACE_ID, bounds);
    expect(growth.totalMembers).toBe(2);
    expect(growth.newMembers).toBe(1);
  });
});
