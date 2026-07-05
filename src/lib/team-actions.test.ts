import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const { inviteMemberAction, changeRoleAction, removeMemberAction } = await import(
  "@/lib/team-actions"
);

const SLUG = `test-team-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-team-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-team-other-${randomUUID()}`;
const OTHER_SLUG = `test-team-other-${randomUUID()}`;

const OWNER = { id: `user-team-owner-${randomUUID()}`, name: "Team Owner", initials: "TO" };
const OWNER_MEMBERSHIP_ID = randomUUID();
const ADMIN = { id: `user-team-admin-${randomUUID()}`, name: "Team Admin", initials: "TA" };
const VIEWER = { id: `user-team-viewer-${randomUUID()}`, name: "Team Viewer", initials: "TV" };
const OUTSIDER = { id: `user-team-outsider-${randomUUID()}`, name: "Team Outsider", initials: "TU" };
const ELSEWHERE_USER = { id: `user-team-elsewhere-${randomUUID()}`, name: "Team Elsewhere", initials: "TE" };

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

// Ids created by individual tests, cleaned up in the top-level afterAll
// alongside the shared fixtures above.
const dynamicWorkspaceIds: string[] = [];
const dynamicUserIds: string[] = [];

async function createTargetMember(role: string = "Editor", workspaceId: string = WORKSPACE_ID) {
  const user = { id: `user-team-target-${randomUUID()}`, name: "Target Member", initials: "TM" };
  dynamicUserIds.push(user.id);
  await prisma.user.create({
    data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
  });
  const membershipId = randomUUID();
  await prisma.workspaceMembership.create({
    data: { id: membershipId, userId: user.id, workspaceId, role: role as never, status: "Active" },
  });
  return { userId: user.id, membershipId, name: user.name };
}

/** A fresh workspace with exactly `ownerCount` Active Owners plus one Admin (manageTeam, non-owner) who performs the mutations in final-owner tests. */
async function createFinalOwnerFixture(ownerCount: number) {
  const workspaceId = `ws-team-fo-${randomUUID()}`;
  const slug = `test-team-fo-${randomUUID()}`;
  dynamicWorkspaceIds.push(workspaceId);
  await prisma.workspace.create({
    data: { id: workspaceId, name: "Final Owner Test", slug, plan: "Free", initials: "FO" },
  });

  const admin = { id: `user-team-fo-admin-${randomUUID()}`, name: "FO Admin", initials: "FA" };
  dynamicUserIds.push(admin.id);
  await prisma.user.create({
    data: { id: admin.id, name: admin.name, email: `${admin.id}@test.local`, passwordHash: "x", initials: admin.initials },
  });
  await prisma.workspaceMembership.create({
    data: { id: randomUUID(), userId: admin.id, workspaceId, role: "Admin", status: "Active" },
  });

  const owners: { userId: string; membershipId: string; name: string }[] = [];
  for (let i = 0; i < ownerCount; i++) {
    const user = { id: `user-team-fo-owner-${randomUUID()}`, name: `FO Owner ${i}`, initials: "FO" };
    dynamicUserIds.push(user.id);
    await prisma.user.create({
      data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
    });
    const membershipId = randomUUID();
    await prisma.workspaceMembership.create({
      data: { id: membershipId, userId: user.id, workspaceId, role: "Owner", status: "Active" },
    });
    owners.push({ userId: user.id, membershipId, name: user.name });
  }

  return { workspaceId, slug, admin, owners };
}

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Team Test Workspace", slug: SLUG, plan: "Free", initials: "TT" },
      { id: OTHER_WORKSPACE_ID, name: "Team Other Workspace", slug: OTHER_SLUG, plan: "Free", initials: "TO" },
    ],
  });

  for (const user of [OWNER, ADMIN, VIEWER, OUTSIDER, ELSEWHERE_USER]) {
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
      { id: OWNER_MEMBERSHIP_ID, userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: ADMIN.id, workspaceId: WORKSPACE_ID, role: "Admin", status: "Active" },
      { id: randomUUID(), userId: VIEWER.id, workspaceId: WORKSPACE_ID, role: "Viewer", status: "Active" },
      // OUTSIDER has no membership anywhere in WORKSPACE_ID and must stay
      // that way for the 404 tests below — ELSEWHERE_USER (also only a
      // member of OTHER_WORKSPACE_ID) is the one the "invite an existing
      // user" test adds to WORKSPACE_ID, so it doesn't corrupt OUTSIDER's
      // non-membership.
      { id: randomUUID(), userId: OUTSIDER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: ELSEWHERE_USER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Viewer", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({
    where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID, ...dynamicWorkspaceIds] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [OWNER.id, ADMIN.id, VIEWER.id, OUTSIDER.id, ELSEWHERE_USER.id, ...dynamicUserIds] } },
  });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("inviteMemberAction", () => {
  it("invites a brand-new email, creating a User and an Invited membership plus an audit log", async () => {
    actAs(ADMIN);
    const email = `new-invite-${randomUUID()}@test.local`;

    const result = await inviteMemberAction(SLUG, { email, role: "Editor" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.data.email).toBe(email);
    expect(result.data.role).toBe("Editor");
    expect(result.data.status).toBe("Invited");
    dynamicUserIds.push(result.data.userId);

    const membership = await prisma.workspaceMembership.findUniqueOrThrow({
      where: { id: result.data.membershipId },
    });
    expect(membership.status).toBe("Invited");

    const audits = await prisma.auditLog.findMany({
      where: { workspaceMembershipId: result.data.membershipId, action: "TeamMemberInvited" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(ADMIN.id);
  });

  it("reuses an existing User row when inviting someone who already has an account elsewhere", async () => {
    actAs(ADMIN);

    const result = await inviteMemberAction(SLUG, {
      email: `${ELSEWHERE_USER.id}@test.local`,
      role: "Viewer",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.data.userId).toBe(ELSEWHERE_USER.id);

    const userCount = await prisma.user.count({ where: { id: ELSEWHERE_USER.id } });
    expect(userCount).toBe(1);
  });

  it("rejects inviting someone who's already a member of this workspace", async () => {
    actAs(ADMIN);

    const result = await inviteMemberAction(SLUG, { email: `${VIEWER.id}@test.local`, role: "Editor" });

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("forbids a Viewer from inviting", async () => {
    actAs(VIEWER);
    const email = `blocked-invite-${randomUUID()}@test.local`;

    const result = await inviteMemberAction(SLUG, { email, role: "Editor" });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });

  it("rejects an invalid email address", async () => {
    actAs(ADMIN);

    const result = await inviteMemberAction(SLUG, { email: "not-an-email", role: "Editor" });

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("rejects an invalid role", async () => {
    actAs(ADMIN);

    const result = await inviteMemberAction(SLUG, {
      email: `bad-role-${randomUUID()}@test.local`,
      role: "SuperAdmin",
    });

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);

    await expect(
      inviteMemberAction(SLUG, { email: `outsider-invite-${randomUUID()}@test.local`, role: "Editor" })
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") });
  });
});

describe("changeRoleAction", () => {
  it("lets an Admin change another member's role and records an audit log", async () => {
    actAs(ADMIN);
    const target = await createTargetMember("Editor");

    const result = await changeRoleAction(SLUG, target.membershipId, "Manager");

    expect(result).toMatchObject({ ok: true, data: { role: "Manager" } });
    const membership = await prisma.workspaceMembership.findUniqueOrThrow({
      where: { id: target.membershipId },
    });
    expect(membership.role).toBe("Manager");

    const audits = await prisma.auditLog.findMany({
      where: { workspaceMembershipId: target.membershipId, action: "TeamMemberRoleChanged" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(ADMIN.id);
  });

  it("forbids a Viewer from changing roles", async () => {
    actAs(VIEWER);
    const target = await createTargetMember("Editor");

    const result = await changeRoleAction(SLUG, target.membershipId, "Manager");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("blocks a user from changing their own role", async () => {
    actAs(OWNER);

    const result = await changeRoleAction(SLUG, OWNER_MEMBERSHIP_ID, "Admin");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const membership = await prisma.workspaceMembership.findUniqueOrThrow({
      where: { id: OWNER_MEMBERSHIP_ID },
    });
    expect(membership.role).toBe("Owner");
  });

  it("blocks changing another workspace's membership", async () => {
    actAs(ADMIN);
    const foreignTarget = await createTargetMember("Editor", OTHER_WORKSPACE_ID);

    const result = await changeRoleAction(SLUG, foreignTarget.membershipId, "Manager");

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const target = await createTargetMember("Editor");

    await expect(changeRoleAction(SLUG, target.membershipId, "Manager")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  describe("final owner protection", () => {
    it("allows demoting an Owner when a co-owner remains", async () => {
      const { slug, admin, owners } = await createFinalOwnerFixture(2);
      actAs(admin);

      const result = await changeRoleAction(slug, owners[0].membershipId, "Editor");

      expect(result).toMatchObject({ ok: true, data: { role: "Editor" } });
    });

    it("blocks demoting the sole remaining Owner", async () => {
      const { slug, admin, owners } = await createFinalOwnerFixture(1);
      actAs(admin);

      const result = await changeRoleAction(slug, owners[0].membershipId, "Editor");

      expect(result).toMatchObject({ ok: false, code: "forbidden" });
      const membership = await prisma.workspaceMembership.findUniqueOrThrow({
        where: { id: owners[0].membershipId },
      });
      expect(membership.role).toBe("Owner");
    });

    it("lets only one of two concurrent demotions succeed, leaving exactly one Owner", async () => {
      const { workspaceId, slug, admin, owners } = await createFinalOwnerFixture(2);
      actAs(admin);

      const [a, b] = await Promise.all([
        changeRoleAction(slug, owners[0].membershipId, "Editor"),
        changeRoleAction(slug, owners[1].membershipId, "Editor"),
      ]);

      expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
      const ownerCount = await prisma.workspaceMembership.count({
        where: { workspaceId, role: "Owner", status: "Active" },
      });
      expect(ownerCount).toBe(1);
    });
  });
});

describe("removeMemberAction", () => {
  it("lets an Admin remove another member and preserves an audit trail after the row is gone", async () => {
    actAs(ADMIN);
    const target = await createTargetMember("Editor");

    const result = await removeMemberAction(SLUG, target.membershipId);

    expect(result).toMatchObject({ ok: true, data: { id: target.membershipId } });
    const membership = await prisma.workspaceMembership.findUnique({ where: { id: target.membershipId } });
    expect(membership).toBeNull();

    const audits = await prisma.auditLog.findMany({
      where: { actorId: ADMIN.id, action: "TeamMemberRemoved" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].workspaceMembershipId).toBeNull();
    expect(audits[0].metadata).toMatchObject({ targetUserId: target.userId, targetName: target.name });
  });

  it("forbids a Viewer from removing", async () => {
    actAs(VIEWER);
    const target = await createTargetMember("Editor");

    const result = await removeMemberAction(SLUG, target.membershipId);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const membership = await prisma.workspaceMembership.findUnique({ where: { id: target.membershipId } });
    expect(membership).not.toBeNull();
  });

  it("blocks a user from removing themselves", async () => {
    actAs(OWNER);

    const result = await removeMemberAction(SLUG, OWNER_MEMBERSHIP_ID);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const membership = await prisma.workspaceMembership.findUnique({ where: { id: OWNER_MEMBERSHIP_ID } });
    expect(membership).not.toBeNull();
  });

  it("blocks removing another workspace's membership", async () => {
    actAs(ADMIN);
    const foreignTarget = await createTargetMember("Editor", OTHER_WORKSPACE_ID);

    const result = await removeMemberAction(SLUG, foreignTarget.membershipId);

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const target = await createTargetMember("Editor");

    await expect(removeMemberAction(SLUG, target.membershipId)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  describe("final owner protection", () => {
    it("allows removing an Owner when a co-owner remains", async () => {
      const { workspaceId, slug, admin, owners } = await createFinalOwnerFixture(2);
      actAs(admin);

      const result = await removeMemberAction(slug, owners[0].membershipId);

      expect(result).toMatchObject({ ok: true });
      const ownerCount = await prisma.workspaceMembership.count({
        where: { workspaceId, role: "Owner", status: "Active" },
      });
      expect(ownerCount).toBe(1);
    });

    it("blocks removing the sole remaining Owner", async () => {
      const { slug, admin, owners } = await createFinalOwnerFixture(1);
      actAs(admin);

      const result = await removeMemberAction(slug, owners[0].membershipId);

      expect(result).toMatchObject({ ok: false, code: "forbidden" });
      const membership = await prisma.workspaceMembership.findUnique({ where: { id: owners[0].membershipId } });
      expect(membership).not.toBeNull();
    });

    it("lets only one of two concurrent removals succeed, leaving exactly one Owner", async () => {
      const { workspaceId, slug, admin, owners } = await createFinalOwnerFixture(2);
      actAs(admin);

      const [a, b] = await Promise.all([
        removeMemberAction(slug, owners[0].membershipId),
        removeMemberAction(slug, owners[1].membershipId),
      ]);

      expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
      const ownerCount = await prisma.workspaceMembership.count({
        where: { workspaceId, role: "Owner", status: "Active" },
      });
      expect(ownerCount).toBe(1);
    });
  });
});
