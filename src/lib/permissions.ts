import type { TeamRole } from "@/lib/mock-data";

export type Permission =
  | "manageTeam"
  | "manageWorkspace"
  | "createContent"
  | "publishContent"
  | "approveContent"
  | "manageSocialAccounts"
  | "manageMonetization"
  | "manageInbox";

export const PERMISSION_LABELS: Record<Permission, string> = {
  manageTeam: "Manage team",
  manageWorkspace: "Manage workspace settings",
  createContent: "Create content & assets",
  publishContent: "Publish & schedule content",
  approveContent: "Approve content",
  manageSocialAccounts: "Connect social accounts",
  manageMonetization: "Manage monetization deals",
  manageInbox: "Manage the inbox",
};

// Ordered from most to least privileged. Each role's permission set is a
// subset of the role before it (see permissions.test.ts's monotonicity
// check) — Manager sits below Admin (no team management), Moderator below
// Editor (can create but not publish or approve), Analyst is a read-only
// role kept distinct from Viewer for reporting/labeling purposes even
// though the two currently carry identical (zero) permissions.
export const ROLES: TeamRole[] = [
  "Owner",
  "Admin",
  "Manager",
  "Editor",
  "Moderator",
  "Analyst",
  "Viewer",
];

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  Owner: "Full access, including workspace settings and monetization.",
  Admin: "Runs day-to-day operations — content, approvals, team, and channels.",
  Manager: "Runs content operations and approvals, but can't manage the team or connect channels.",
  Editor: "Creates and publishes content, but can't approve, connect accounts, or manage the team.",
  Moderator: "Creates content for review, but can't publish, approve, or manage the team.",
  Analyst: "Read-only access, for reporting and analytics.",
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
    manageInbox: true,
  },
  Admin: {
    manageTeam: true,
    manageWorkspace: false,
    createContent: true,
    publishContent: true,
    approveContent: true,
    manageSocialAccounts: true,
    manageMonetization: false,
    manageInbox: true,
  },
  Manager: {
    manageTeam: true,
    manageWorkspace: false,
    createContent: true,
    publishContent: true,
    approveContent: true,
    manageSocialAccounts: false,
    manageMonetization: false,
    manageInbox: true,
  },
  Editor: {
    manageTeam: false,
    manageWorkspace: false,
    createContent: true,
    publishContent: true,
    approveContent: false,
    manageSocialAccounts: false,
    manageMonetization: false,
    manageInbox: false,
  },
  Moderator: {
    manageTeam: false,
    manageWorkspace: false,
    createContent: true,
    publishContent: false,
    approveContent: false,
    manageSocialAccounts: false,
    manageMonetization: false,
    manageInbox: false,
  },
  Analyst: {
    manageTeam: false,
    manageWorkspace: false,
    createContent: false,
    publishContent: false,
    approveContent: false,
    manageSocialAccounts: false,
    manageMonetization: false,
    manageInbox: false,
  },
  Viewer: {
    manageTeam: false,
    manageWorkspace: false,
    createContent: false,
    publishContent: false,
    approveContent: false,
    manageSocialAccounts: false,
    manageMonetization: false,
    manageInbox: false,
  },
};

export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return PERMISSIONS[role][permission];
}
