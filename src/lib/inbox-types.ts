/**
 * Plain, client-safe module — no "server-only", no Prisma imports — so
 * client components (filter controls, badges) can share these unions
 * with the server-only inbox-data/actions modules without pulling
 * Prisma into the client bundle. Mirrors social-account-types.ts.
 */
export type InboxItemType = "Comment" | "DirectMessage" | "Mention" | "Notification";

export const INBOX_ITEM_TYPE_LABEL: Record<InboxItemType, string> = {
  Comment: "Comment",
  DirectMessage: "Direct Message",
  Mention: "Mention",
  Notification: "Notification",
};

export const INBOX_ITEM_TYPES: InboxItemType[] = [
  "DirectMessage",
  "Comment",
  "Mention",
  "Notification",
];

export type ConversationStatus = "Open" | "Resolved";

export type MessageSender = "them" | "you";
