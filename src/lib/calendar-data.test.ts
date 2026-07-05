import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const { getWorkspaceCalendarEvents } = await import("@/lib/calendar-data");

const WORKSPACE_ID = `ws-caldata-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-caldata-other-${randomUUID()}`;

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "CalData Workspace", slug: `caldata-${randomUUID()}`, plan: "Free", initials: "CD" },
      { id: OTHER_WORKSPACE_ID, name: "CalData Other", slug: `caldata-other-${randomUUID()}`, plan: "Free", initials: "CO" },
    ],
  });

  await prisma.calendarEvent.createMany({
    data: [
      { id: randomUUID(), workspaceId: WORKSPACE_ID, title: "Mine", platform: "Instagram", scheduledAt: new Date("2026-08-01T07:30:00") },
      { id: randomUUID(), workspaceId: WORKSPACE_ID, title: "Also mine", platform: "TikTok", scheduledAt: new Date("2026-08-02T14:00:00") },
      { id: randomUUID(), workspaceId: OTHER_WORKSPACE_ID, title: "Not mine", platform: "X", scheduledAt: new Date("2026-08-01T07:30:00") },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.$disconnect();
});

describe("getWorkspaceCalendarEvents", () => {
  it("only returns events for the given workspace, formatted for the UI", async () => {
    const events = await getWorkspaceCalendarEvents(WORKSPACE_ID);

    expect(events).toHaveLength(2);
    expect(events.every((e) => e.workspaceId === WORKSPACE_ID)).toBe(true);
    expect(events.map((e) => e.title).sort()).toEqual(["Also mine", "Mine"]);

    const first = events.find((e) => e.title === "Mine");
    expect(first?.date).toBe("2026-08-01");
    expect(first?.time).toBe("7:30 AM");
  });

  it("never returns another workspace's events", async () => {
    const events = await getWorkspaceCalendarEvents(WORKSPACE_ID);
    expect(events.some((e) => e.title === "Not mine")).toBe(false);
  });
});
