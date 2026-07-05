import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prisma } = await import("@/lib/prisma");
const {
  getWorkspaceConversations,
  getWorkspaceConversationCounts,
  getConversationDetail,
  getAssignableMembers,
} = await import("@/lib/inbox-data");

const WORKSPACE_ID = `ws-inbox-data-${randomUUID()}`;
const OTHER_WORKSPACE_ID = `ws-inbox-data-other-${randomUUID()}`;

const OWNER_ID = `user-inbox-data-owner-${randomUUID()}`;
const INVITED_ID = `user-inbox-data-invited-${randomUUID()}`;
const OWNER_MEMBERSHIP_ID = randomUUID();

const DM_UNREAD_ID = randomUUID();
const COMMENT_RESOLVED_ID = randomUUID();
const ARCHIVED_ID = randomUUID();
const ASSIGNED_ID = randomUUID();
const OTHER_WORKSPACE_CONVERSATION_ID = randomUUID();

beforeAll(async () => {
  await prisma.workspace.createMany({
    data: [
      { id: WORKSPACE_ID, name: "Inbox Data Workspace", slug: `id-${randomUUID()}`, plan: "Free", initials: "ID" },
      { id: OTHER_WORKSPACE_ID, name: "Inbox Data Other Workspace", slug: `id-other-${randomUUID()}`, plan: "Free", initials: "IX" },
    ],
  });

  await prisma.user.createMany({
    data: [
      { id: OWNER_ID, name: "Data Owner", email: `${OWNER_ID}@test.local`, passwordHash: "x", initials: "DO" },
      { id: INVITED_ID, name: "Data Invited", email: `${INVITED_ID}@test.local`, passwordHash: "x", initials: "DI" },
    ],
  });

  await prisma.workspaceMembership.createMany({
    data: [
      { id: OWNER_MEMBERSHIP_ID, userId: OWNER_ID, workspaceId: WORKSPACE_ID, role: "Owner", status: "Active" },
      { id: randomUUID(), userId: INVITED_ID, workspaceId: WORKSPACE_ID, role: "Editor", status: "Invited" },
    ],
  });

  const now = new Date();
  await prisma.conversation.createMany({
    data: [
      {
        id: DM_UNREAD_ID,
        workspaceId: WORKSPACE_ID,
        platform: "Instagram",
        type: "DirectMessage",
        contactName: "Sophie Marlowe",
        contactHandle: "@sophie",
        contactInitials: "SM",
        unread: true,
        status: "Open",
        archived: false,
        updatedAt: new Date(now.getTime() - 1000),
      },
      {
        id: COMMENT_RESOLVED_ID,
        workspaceId: WORKSPACE_ID,
        platform: "TikTok",
        type: "Comment",
        contactName: "Jordan Wells",
        contactHandle: "@jordanw",
        contactInitials: "JW",
        unread: false,
        status: "Resolved",
        archived: false,
        updatedAt: new Date(now.getTime() - 2000),
      },
      {
        id: ARCHIVED_ID,
        workspaceId: WORKSPACE_ID,
        platform: "X",
        type: "Mention",
        contactName: "Dev Fan",
        contactHandle: "@devfan",
        contactInitials: "DF",
        unread: false,
        status: "Open",
        archived: true,
        updatedAt: new Date(now.getTime() - 3000),
      },
      {
        id: ASSIGNED_ID,
        workspaceId: WORKSPACE_ID,
        platform: "LinkedIn",
        type: "DirectMessage",
        contactName: "Nova Retail",
        contactHandle: "Nova Retail",
        contactInitials: "NR",
        unread: false,
        status: "Open",
        archived: false,
        assignedToMembershipId: OWNER_MEMBERSHIP_ID,
        updatedAt: new Date(now.getTime() - 4000),
      },
      {
        id: OTHER_WORKSPACE_CONVERSATION_ID,
        workspaceId: OTHER_WORKSPACE_ID,
        platform: "Instagram",
        type: "DirectMessage",
        contactName: "Not Yours",
        contactHandle: "@notyours",
        contactInitials: "NY",
        unread: true,
        status: "Open",
        archived: false,
      },
    ],
  });

  await prisma.inboxMessage.createMany({
    data: [
      { id: randomUUID(), conversationId: DM_UNREAD_ID, from: "them", body: "Where's that jacket from?" },
      { id: randomUUID(), conversationId: COMMENT_RESOLVED_ID, from: "them", body: "Love this reel!" },
      { id: randomUUID(), conversationId: COMMENT_RESOLVED_ID, from: "you", body: "Thank you!!" },
    ],
  });

  await prisma.conversationNote.create({
    data: {
      id: randomUUID(),
      conversationId: DM_UNREAD_ID,
      authorId: OWNER_ID,
      authorName: "Data Owner",
      body: "Internal note about Sophie.",
    },
  });
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [WORKSPACE_ID, OTHER_WORKSPACE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER_ID, INVITED_ID] } } });
  await prisma.$disconnect();
});

describe("getWorkspaceConversations", () => {
  it("excludes archived conversations by default and never leaks another workspace's rows", async () => {
    const { items } = await getWorkspaceConversations(WORKSPACE_ID);
    const ids = items.map((c) => c.id);
    expect(ids).toContain(DM_UNREAD_ID);
    expect(ids).toContain(COMMENT_RESOLVED_ID);
    expect(ids).toContain(ASSIGNED_ID);
    expect(ids).not.toContain(ARCHIVED_ID);
    expect(ids).not.toContain(OTHER_WORKSPACE_CONVERSATION_ID);
  });

  it("filters by archived: true", async () => {
    const { items } = await getWorkspaceConversations(WORKSPACE_ID, { archived: true });
    expect(items.map((c) => c.id)).toEqual([ARCHIVED_ID]);
  });

  it("filters by type", async () => {
    const { items } = await getWorkspaceConversations(WORKSPACE_ID, { type: "Comment" });
    expect(items.map((c) => c.id)).toEqual([COMMENT_RESOLVED_ID]);
  });

  it("filters by status", async () => {
    const { items } = await getWorkspaceConversations(WORKSPACE_ID, { status: "Resolved" });
    expect(items.map((c) => c.id)).toEqual([COMMENT_RESOLVED_ID]);
  });

  it("filters by unreadOnly", async () => {
    const { items } = await getWorkspaceConversations(WORKSPACE_ID, { unreadOnly: true });
    expect(items.map((c) => c.id)).toEqual([DM_UNREAD_ID]);
  });

  it("filters by assignedToMembershipId, including the unassigned sentinel", async () => {
    const assigned = await getWorkspaceConversations(WORKSPACE_ID, { assignedToMembershipId: OWNER_MEMBERSHIP_ID });
    expect(assigned.items.map((c) => c.id)).toEqual([ASSIGNED_ID]);

    const unassigned = await getWorkspaceConversations(WORKSPACE_ID, { assignedToMembershipId: "unassigned" });
    expect(unassigned.items.map((c) => c.id).sort()).toEqual([COMMENT_RESOLVED_ID, DM_UNREAD_ID].sort());
  });

  it("searches contact name, handle, and message body", async () => {
    const byName = await getWorkspaceConversations(WORKSPACE_ID, { search: "sophie" });
    expect(byName.items.map((c) => c.id)).toEqual([DM_UNREAD_ID]);

    const byBody = await getWorkspaceConversations(WORKSPACE_ID, { search: "jacket" });
    expect(byBody.items.map((c) => c.id)).toEqual([DM_UNREAD_ID]);
  });

  it("cursor-paginates in stable updatedAt-desc order without skipping or repeating rows", async () => {
    const page1 = await getWorkspaceConversations(WORKSPACE_ID, {}, undefined, 2);
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await getWorkspaceConversations(WORKSPACE_ID, {}, page1.nextCursor!, 2);
    expect(page2.items.length).toBeGreaterThan(0);

    const page1Ids = page1.items.map((c) => c.id);
    const page2Ids = page2.items.map((c) => c.id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);

    const allIds = [...page1Ids, ...page2Ids];
    expect(allIds.sort()).toEqual([ASSIGNED_ID, COMMENT_RESOLVED_ID, DM_UNREAD_ID].sort());
  });
});

describe("getWorkspaceConversationCounts", () => {
  it("counts total and unread for the current filter set, scoped to the workspace", async () => {
    const counts = await getWorkspaceConversationCounts(WORKSPACE_ID);
    expect(counts.total).toBe(3);
    expect(counts.unread).toBe(1);
  });
});

describe("getConversationDetail", () => {
  it("returns the full thread and notes, ordered oldest first", async () => {
    const detail = await getConversationDetail(WORKSPACE_ID, COMMENT_RESOLVED_ID);
    expect(detail?.messages.map((m) => m.body)).toEqual(["Love this reel!", "Thank you!!"]);
  });

  it("includes internal notes", async () => {
    const detail = await getConversationDetail(WORKSPACE_ID, DM_UNREAD_ID);
    expect(detail?.notes).toHaveLength(1);
    expect(detail?.notes[0].body).toBe("Internal note about Sophie.");
  });

  it("returns null for a conversation in another workspace", async () => {
    const detail = await getConversationDetail(WORKSPACE_ID, OTHER_WORKSPACE_CONVERSATION_ID);
    expect(detail).toBeNull();
  });
});

describe("getAssignableMembers", () => {
  it("only returns Active members, not Invited ones", async () => {
    const members = await getAssignableMembers(WORKSPACE_ID);
    expect(members.map((m) => m.membershipId)).toEqual([OWNER_MEMBERSHIP_ID]);
  });
});
