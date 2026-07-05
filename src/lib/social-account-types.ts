/**
 * Plain, client-safe module — no "server-only", no Prisma imports — so
 * client components (status badges, connect dialog) can share these
 * unions with the server-only social-account-data/actions modules
 * without pulling Prisma into the client bundle.
 */
export type SocialStatus = "Connected" | "NotConnected" | "NeedsReauth";

export const SOCIAL_STATUS_LABEL: Record<SocialStatus, string> = {
  Connected: "Connected",
  NotConnected: "Not Connected",
  NeedsReauth: "Needs Reauth",
};

/** Derived, not stored — see getConnectionHealth in social-account-data.ts for how it's computed. */
export type ConnectionHealth = "Healthy" | "ExpiringSoon" | "Expired" | "Disconnected";

export const CONNECTION_HEALTH_LABEL: Record<ConnectionHealth, string> = {
  Healthy: "Healthy",
  ExpiringSoon: "Expiring soon",
  Expired: "Needs attention",
  Disconnected: "Disconnected",
};
