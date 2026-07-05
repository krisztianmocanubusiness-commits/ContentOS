import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const { prisma } = await import("@/lib/prisma");
const {
  addConversationNoteAction,
  archiveConversationAction,
  assignConversationAction,
  getConversationDetailAction,
  getConversationsAction,
  markConversationReadAction,
  markConversationUnreadAction,
  reopenConversationAction,
  replyToConversationAction,
  resolveConversationAction,
  unarchiveConversationAction,
} = await import("@/lib/inbox-actions");

const SLUG = `test-inbox-actions-${randomUUID()}`;
const WORKSPACE_ID = `ws-inbox-actions-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-inbox-actions-other-${randomUUID()}`;

const OWNER = { id: `user-ia-owner-${randomUUID()}`, name: "Inbox Owner", initials: "IO" };
const EDITOR = { id: `user-ia-editor-${randomUUID()}`, name: "Inbox Editor", initials: "IE" };
const OUTSIDER = { id: `user-ia-outsider-${randomUUID()}`, name: "Inbox Outsider", initials: "IX" };

let ownerMembershipId: string;

function actAs(user: { id: string; name: string; initials: string }) {
  mockAuth.mockResolvedValue({ user: { ...user, email: `${user.id}@test.local` } });
}

async function createTestConversation(overrides: Partial<{ workspaceId: string; unread: boolean; archived: boolean; status: "Open" | "Resolved" }> = {}) {
  const id = randomUUID();
  await prisma.conversation.create({
    data: {
      id,
      workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
      platform: "Instagram",
      type: "DirectMessage",
      contactName: "Test Contact",
      contactHandle: "@test",
      contactInitials: "TC",
      unread: overrides.unread ?? true,
      archived: overrides.archived ?? false,
      status: overrides.status ?? "Open",
    },
  });
  return id;
}

beforeAll(async () => {
  ownerMembershipId = randomUUID();

  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Inbox Actions Workspace", slug: SLUG, plan: "Free", initials: "IA" },
      { id: OTHER_WORKSPACE_ID, name: "Inbox Actions Other Workspace", slug: `${SLUG}-other`, plan: "Free", initials: "IX" },
    ],
  });

  for (const user of [OWNER, EDITOR, OUTSIDER]) {
    await prisma.user.create({
      data: { id: user.id, name: user.name, email: `${user.id}@test.local`, passwordHash: "x", initials: user.initials },
    });
  }

  await prisma.workspaceMembership.createMany({
    data: [
      { id: ownerMembershipId, userId: OWNER.id, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: EDITOR.id, workspaceId: WORKSPACE_ID, role: "Editor", status: "Active" },
      { id: randomUUID(), userId: OUTSIDER.id, workspaceId: OTHER_WORKSPACE_ID, role: "Owner", status: "Active" },
    ],
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER.id, EDITOR.id, OUTSIDER.id] } } });
  await prisma.$disconnect();
});

afterEach(() => {
  mockAuth.mockReset();
});

describe("markConversationReadAction / markConversationUnreadAction", () => {
  it("marks a conversation read, persists it, and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestConversation({ unread: true });

    const result = await markConversationReadAction(SLUG, id);

    expect(result).toMatchObject({ ok: true, data: { unread: false } });
    const row = await prisma.conversation.findUniqueOrThrow({ where: { id } });
    expect(row.unread).toBe(false);

    const audits = await prisma.auditLog.findMany({ where: { conversationId: id, action: "ConversationMarkedRead" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(OWNER.id);
  });

  it("marks a conversation unread and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestConversation({ unread: false });

    const result = await markConversationUnreadAction(SLUG, id);

    expect(result).toMatchObject({ ok: true, data: { unread: true } });
    const audits = await prisma.auditLog.findMany({ where: { conversationId: id, action: "ConversationMarkedUnread" } });
    expect(audits).toHaveLength(1);
  });

  it("forbids an Editor (manageInbox is Owner/Admin/Manager only)", async () => {
    actAs(EDITOR);
    const id = await createTestConversation({ unread: true });

    const result = await markConversationReadAction(SLUG, id);

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    const row = await prisma.conversation.findUniqueOrThrow({ where: { id } });
    expect(row.unread).toBe(true);
  });

  it("blocks acting on another workspace's conversation", async () => {
    actAs(OWNER);
    const foreignId = await createTestConversation({ workspaceId: OTHER_WORKSPACE_ID, unread: true });

    const result = await markConversationReadAction(SLUG, foreignId);

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("404s a caller with no membership in the workspace", async () => {
    actAs(OUTSIDER);
    const id = await createTestConversation({ unread: true });

    await expect(markConversationReadAction(SLUG, id)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});

describe("archiveConversationAction / unarchiveConversationAction", () => {
  it("archives and unarchives, persisting the flag and recording an audit log each time", async () => {
    actAs(OWNER);
    const id = await createTestConversation({ archived: false });

    const archived = await archiveConversationAction(SLUG, id);
    expect(archived).toMatchObject({ ok: true, data: { archived: true } });

    const unarchived = await unarchiveConversationAction(SLUG, id);
    expect(unarchived).toMatchObject({ ok: true, data: { archived: false } });

    const audits = await prisma.auditLog.findMany({
      where: { conversationId: id, action: { in: ["ConversationArchived", "ConversationUnarchived"] } },
    });
    expect(audits).toHaveLength(2);
  });

  it("rejects archiving an already-archived conversation", async () => {
    actAs(OWNER);
    const id = await createTestConversation({ archived: true });

    const result = await archiveConversationAction(SLUG, id);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });
});

describe("resolveConversationAction / reopenConversationAction", () => {
  it("resolves and reopens, persisting status and recording an audit log each time", async () => {
    actAs(OWNER);
    const id = await createTestConversation({ status: "Open" });

    const resolved = await resolveConversationAction(SLUG, id);
    expect(resolved).toMatchObject({ ok: true, data: { status: "Resolved" } });

    const reopened = await reopenConversationAction(SLUG, id);
    expect(reopened).toMatchObject({ ok: true, data: { status: "Open" } });

    const audits = await prisma.auditLog.findMany({
      where: { conversationId: id, action: { in: ["ConversationResolved", "ConversationReopened"] } },
    });
    expect(audits).toHaveLength(2);
  });
});

describe("assignConversationAction", () => {
  it("assigns to a valid membership, persists it, and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestConversation();

    const result = await assignConversationAction(SLUG, id, ownerMembershipId);

    expect(result).toMatchObject({ ok: true, data: { assignedTo: { membershipId: ownerMembershipId } } });
    const row = await prisma.conversation.findUniqueOrThrow({ where: { id } });
    expect(row.assignedToMembershipId).toBe(ownerMembershipId);

    const audits = await prisma.auditLog.findMany({ where: { conversationId: id, action: "ConversationAssigned" } });
    expect(audits).toHaveLength(1);
  });

  it("unassigns with a null membershipId", async () => {
    actAs(OWNER);
    const id = await createTestConversation();
    await assignConversationAction(SLUG, id, ownerMembershipId);

    const result = await assignConversationAction(SLUG, id, null);

    expect(result).toMatchObject({ ok: true, data: { assignedTo: null } });
  });

  it("rejects assigning to a membership from another workspace", async () => {
    actAs(OWNER);
    const id = await createTestConversation();
    const foreignMembership = await prisma.workspaceMembership.findFirstOrThrow({
      where: { workspaceId: OTHER_WORKSPACE_ID },
    });

    const result = await assignConversationAction(SLUG, id, foreignMembership.id);

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });
});

describe("addConversationNoteAction", () => {
  it("adds an internal note, persists it, and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestConversation();

    const result = await addConversationNoteAction(SLUG, id, "Flagging for follow-up.");

    expect(result).toMatchObject({ ok: true, data: { body: "Flagging for follow-up.", authorName: OWNER.name } });
    const notes = await prisma.conversationNote.findMany({ where: { conversationId: id } });
    expect(notes).toHaveLength(1);

    const audits = await prisma.auditLog.findMany({ where: { conversationId: id, action: "ConversationNoteAdded" } });
    expect(audits).toHaveLength(1);
  });

  it("rejects a blank note", async () => {
    actAs(OWNER);
    const id = await createTestConversation();

    const result = await addConversationNoteAction(SLUG, id, "   ");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });
});

describe("replyToConversationAction", () => {
  it("appends a 'you' message, bumps updatedAt, and records an audit log", async () => {
    actAs(OWNER);
    const id = await createTestConversation();
    const before = await prisma.conversation.findUniqueOrThrow({ where: { id } });

    const result = await replyToConversationAction(SLUG, id, "Thanks for reaching out!");

    expect(result).toMatchObject({ ok: true, data: { from: "you", body: "Thanks for reaching out!" } });
    const messages = await prisma.inboxMessage.findMany({ where: { conversationId: id } });
    expect(messages).toHaveLength(1);

    const after = await prisma.conversation.findUniqueOrThrow({ where: { id } });
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(before.updatedAt.getTime());

    const audits = await prisma.auditLog.findMany({ where: { conversationId: id, action: "ConversationReplied" } });
    expect(audits).toHaveLength(1);
  });

  it("forbids an Editor from replying", async () => {
    actAs(EDITOR);
    const id = await createTestConversation();

    const result = await replyToConversationAction(SLUG, id, "Blocked reply");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("getConversationsAction / getConversationDetailAction", () => {
  it("is readable by any workspace member, including an Editor without manageInbox", async () => {
    actAs(EDITOR);
    await createTestConversation();

    const result = await getConversationsAction(SLUG, {});

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.counts.total).toBeGreaterThan(0);
  });

  it("404s getConversationDetailAction for a caller with no membership", async () => {
    actAs(OWNER);
    const id = await createTestConversation();
    actAs(OUTSIDER);

    await expect(getConversationDetailAction(SLUG, id)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
