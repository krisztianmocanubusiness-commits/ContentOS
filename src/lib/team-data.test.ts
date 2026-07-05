import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const { getWorkspaceTeamMembers } = await import("@/lib/team-data");

const WORKSPACE_ID = `ws-team-data-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-team-data-other-${randomUUID()}`;

const OWNER = { id: `user-td-owner-${randomUUID()}`, name: "Data Owner", initials: "DO" };
const EDITOR = { id: `user-td-editor-${randomUUID()}`, name: "Data Editor", initials: "DE" };
const INVITED = { id: `user-td-invited-${randomUUID()}`, name: "Data Invited", initials: "DI" };
const OTHER_USER = { id: `user-td-other-${randomUUID()}`, name: "Data Other", initials: "DX" };

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Team Data Workspace", slug: `td-${randomUUID()}`, plan: "Free", initials: "TD" },
      { id: OTHER_WORKSPACE_ID, name: "Team Data Other Workspace", slug: `td-other-${randomUUID()}`, plan: "Free", initials: "TX" },
    ],
  });

  for (const user of [OWNER, EDITOR, INVITED, OTHER_USER]) {
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
      { id: randomUUID(), userId: INVITED.id, workspaceId: WORKSPACE_ID, role: "Viewer", status: "Invited" },
      { id: randomUUID(), userId: OTHER_USER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
    ],
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      workspaceId: WORKSPACE_ID,
      actorId: OWNER.id,
      actorName: OWNER.name,
      action: "ContentApproved",
    },
  });
  // Activity on the other workspace must never affect this workspace's read.
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      workspaceId: OTHER_WORKSPACE_ID,
      actorId: OTHER_USER.id,
      actorName: OTHER_USER.name,
      action: "ContentApproved",
    },
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, EDITOR.id, INVITED.id, OTHER_USER.id] } } });
  await prisma.$disconnect();
});

describe("getWorkspaceTeamMembers", () => {
  it("returns every member with their real role, status, and email, scoped to the workspace", async () => {
    const members = await getWorkspaceTeamMembers(WORKSPACE_ID);

    expect(members).toHaveLength(3);
    const owner = members.find((m) => m.userId === OWNER.id);
    expect(owner).toMatchObject({ role: "Owner", status: "Active", email: `${OWNER.id}@test.local` });
    const invited = members.find((m) => m.userId === INVITED.id);
    expect(invited).toMatchObject({ role: "Viewer", status: "Invited" });
  });

  it("reports last activity from AuditLog, and no activity for members with none", async () => {
    const members = await getWorkspaceTeamMembers(WORKSPACE_ID);

    const owner = members.find((m) => m.userId === OWNER.id);
    expect(owner?.lastActive).not.toBeNull();
    const editor = members.find((m) => m.userId === EDITOR.id);
    expect(editor?.lastActive).toBeNull();
  });

  it("never returns another workspace's members or activity", async () => {
    const members = await getWorkspaceTeamMembers(WORKSPACE_ID);

    expect(members.some((m) => m.userId === OTHER_USER.id)).toBe(false);
  });
});
