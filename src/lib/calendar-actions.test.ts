import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const {
  createEventAction,
  updateEventAction,
  rescheduleEventAction,
  deleteEventAction,
} = await import("@/lib/calendar-actions");

const SLUG = `test-calendar-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-cal-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-cal-other-${randomUUID()}`;
const OTHER_SLUG = `test-calendar-other-${randomUUID()}`;

const OWNER = { id: `user-cal-owner-${randomUUID()}`, name: "Cal Owner", initials: "CO" };
const VIEWER = { id: `user-cal-viewer-${randomUUID()}`, name: "Cal Viewer", initials: "CV" };

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

async function createRawEvent(workspaceId: string, overrides: Partial<{ title: string }> = {}) {
  return prisma.calendarEvent.create({
    data: {
      id: randomUUID(),
      workspaceId,
      title: overrides.title ?? "Existing post",
      platform: "Instagram",
      scheduledAt: new Date("2026-08-01T09:00:00"),
    },
  });
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Cal Test Workspace", slug: SLUG, plan: "Free", initials: "CW" },
      { id: OTHER_WORKSPACE_ID, name: "Cal Other Workspace", slug: OTHER_SLUG, plan: "Free", initials: "CO" },
    ],
  });

  for (const user of [OWNER, VIEWER]) {
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
      { id: randomUUID(), userId: VIEWER.id, workspaceId: WORKSPACE_ID, role: "Viewer", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, VIEWER.id] } } });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("createEventAction", () => {
  it("creates an event and records an audit log", async () => {
    actAs(OWNER);

    const result = await createEventAction(SLUG, {
      title: "Summer lookbook",
      platform: "Instagram",
      date: "2026-08-10",
      time: "9:00 AM",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.data.title).toBe("Summer lookbook");
    expect(result.data.date).toBe("2026-08-10");
    expect(result.data.time).toBe("9:00 AM");

    const row = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: result.data.id } });
    expect(row.workspaceId).toBe(WORKSPACE_ID);

    const audits = await prisma.auditLog.findMany({
      where: { calendarEventId: result.data.id, action: "CalendarEventCreated" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(OWNER.id);
  });

  it("forbids a Viewer from creating an event", async () => {
    actAs(VIEWER);

    const result = await createEventAction(SLUG, {
      title: "Should not be created",
      platform: "Instagram",
      date: "2026-08-10",
      time: "9:00 AM",
    });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const rows = await prisma.calendarEvent.findMany({
      where: { workspaceId: WORKSPACE_ID, title: "Should not be created" },
    });
    expect(rows).toHaveLength(0);
  });

  it("rejects a blank title", async () => {
    actAs(OWNER);

    const result = await createEventAction(SLUG, {
      title: "   ",
      platform: "Instagram",
      date: "2026-08-10",
      time: "9:00 AM",
    });

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("rejects an invalid platform", async () => {
    actAs(OWNER);

    const result = await createEventAction(SLUG, {
      title: "Bad platform",
      platform: "Friendster",
      date: "2026-08-10",
      time: "9:00 AM",
    });

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });
});

describe("updateEventAction", () => {
  it("updates title, platform, date, and time", async () => {
    actAs(OWNER);
    const event = await createRawEvent(WORKSPACE_ID);

    const result = await updateEventAction(SLUG, event.id, {
      title: "Updated title",
      platform: "TikTok",
      date: "2026-08-15",
      time: "2:00 PM",
    });

    expect(result).toMatchObject({
      ok: true,
      data: { title: "Updated title", platform: "TikTok", date: "2026-08-15", time: "2:00 PM" },
    });

    const audits = await prisma.auditLog.findMany({
      where: { calendarEventId: event.id, action: "CalendarEventUpdated" },
    });
    expect(audits).toHaveLength(1);
  });

  it("forbids a Viewer from updating", async () => {
    actAs(VIEWER);
    const event = await createRawEvent(WORKSPACE_ID);

    const result = await updateEventAction(SLUG, event.id, {
      title: "Should not apply",
      platform: "Instagram",
      date: "2026-08-15",
      time: "2:00 PM",
    });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("blocks updating an event that belongs to a different workspace", async () => {
    actAs(OWNER);
    const foreignEvent = await createRawEvent(OTHER_WORKSPACE_ID);

    const result = await updateEventAction(SLUG, foreignEvent.id, {
      title: "Sneaky update",
      platform: "Instagram",
      date: "2026-08-15",
      time: "2:00 PM",
    });

    expect(result).toMatchObject({ ok: false, code: "not_found" });
    const untouched = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: foreignEvent.id } });
    expect(untouched.title).toBe("Existing post");
  });
});

describe("rescheduleEventAction", () => {
  it("only changes date and time, leaving title/platform untouched", async () => {
    actAs(OWNER);
    const event = await createRawEvent(WORKSPACE_ID, { title: "Keep my title" });

    const result = await rescheduleEventAction(SLUG, event.id, { date: "2026-09-01", time: "11:00 AM" });

    expect(result).toMatchObject({
      ok: true,
      data: { title: "Keep my title", date: "2026-09-01", time: "11:00 AM" },
    });

    const audits = await prisma.auditLog.findMany({
      where: { calendarEventId: event.id, action: "CalendarEventRescheduled" },
    });
    expect(audits).toHaveLength(1);
  });

  it("forbids a Viewer from rescheduling", async () => {
    actAs(VIEWER);
    const event = await createRawEvent(WORKSPACE_ID);

    const result = await rescheduleEventAction(SLUG, event.id, { date: "2026-09-01", time: "11:00 AM" });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("blocks rescheduling an event from a different workspace", async () => {
    actAs(OWNER);
    const foreignEvent = await createRawEvent(OTHER_WORKSPACE_ID);

    const result = await rescheduleEventAction(SLUG, foreignEvent.id, { date: "2026-09-01", time: "11:00 AM" });

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("deleteEventAction", () => {
  it("deletes the event and keeps an audit trail with the title in metadata", async () => {
    actAs(OWNER);
    const event = await createRawEvent(WORKSPACE_ID, { title: "Doomed post" });

    const result = await deleteEventAction(SLUG, event.id);

    expect(result).toMatchObject({ ok: true, data: { id: event.id } });

    const row = await prisma.calendarEvent.findUnique({ where: { id: event.id } });
    expect(row).toBeNull();

    const audits = await prisma.auditLog.findMany({
      where: { action: "CalendarEventDeleted", actorId: OWNER.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].calendarEventId).toBeNull(); // FK set null after the row is gone
    expect((audits[0].metadata as { title?: string } | null)?.title).toBe("Doomed post");
  });

  it("forbids a Viewer from deleting", async () => {
    actAs(VIEWER);
    const event = await createRawEvent(WORKSPACE_ID);

    const result = await deleteEventAction(SLUG, event.id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const row = await prisma.calendarEvent.findUnique({ where: { id: event.id } });
    expect(row).not.toBeNull();
  });

  it("blocks deleting an event from a different workspace", async () => {
    actAs(OWNER);
    const foreignEvent = await createRawEvent(OTHER_WORKSPACE_ID);

    const result = await deleteEventAction(SLUG, foreignEvent.id);

    expect(result).toMatchObject({ ok: false, code: "not_found" });
    const row = await prisma.calendarEvent.findUnique({ where: { id: foreignEvent.id } });
    expect(row).not.toBeNull();
  });
});
