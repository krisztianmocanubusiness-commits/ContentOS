import type { TeamRole } from "@/lib/mock-data";

export type Permission =
  | "manageTeam"
  | "manageWorkspace"
  | "createContent"
  | "publishContent"
  | "approveContent"
  | "manageSocialAccounts"
  | "manageMonetization";

export const PERMISSION_LABELS: Record<Permission, string> = {
  manageTeam: "Manage team",
  manageWorkspace: "Manage workspace settings",
  createContent: "Create content & assets",
  publishContent: "Publish & schedule content",
  approveContent: "Approve content",
  manageSocialAccounts: "Connect social accounts",
  manageMonetization: "Manage monetization deals",
};

export const ROLES: TeamRole[] = ["Owner", "Admin", "Editor", "Viewer"];

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  Owner: "Full access, including workspace settings and monetization.",
  Admin: "Runs day-to-day operations — content, approvals, team, and channels.",
  Editor: "Creates and publishes content, but can't approve, connect accounts, or manage the team.",
  Viewer: "Read-only access across the workspace.",
};

const PERMISSIONS: Record<TeamRole, Record<Permission, boolean>> = {
  Owner: {
    manageTeam: true,
    manageWorkspace: true,
    createContent: true,
    publishContent: true,
    approveContent: true,
    manageSocialAccounts: true,
    manageMonetization: true,
  },
  Admin: {
    manageTeam: true,
    manageWorkspace: false,
    createContent: true,
    publishContent: true,
    approveContent: true,
    manageSocialAccounts: true,
    manageMonetization: false,
  },
  Editor: {
    manageTeam: false,
    manageWorkspace: false,
    createContent: true,
    publishContent: true,
    approveContent: false,
    manageSocialAccounts: false,
    manageMonetization: false,
  },
  Viewer: {
    manageTeam: false,
    manageWorkspace: false,
    createContent: false,
    publishContent: false,
    approveContent: false,
    manageSocialAccounts: false,
    manageMonetization: false,
  },
};

export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return PERMISSIONS[role][permission];
}
