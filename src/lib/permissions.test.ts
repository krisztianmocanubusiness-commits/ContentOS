import { describe, expect, it } from "vitest";

import { hasPermission, PERMISSION_LABELS, ROLES, type Permission } from "./permissions";
import type { TeamRole } from "./mock-data";

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

// ROLES is ordered most- to least-privileged; rank it so "higher" means
// "more privileged" for the monotonicity check below.
const RANK = Object.fromEntries(
  ROLES.map((role, index) => [role, ROLES.length - index])
) as Record<TeamRole, number>;

describe("hasPermission", () => {
  it("grants Owner every permission", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("Owner", permission)).toBe(true);
    }
  });

  it("grants Viewer no permissions", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("Viewer", permission)).toBe(false);
    }
  });

  it("grants Analyst no permissions", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("Analyst", permission)).toBe(false);
    }
  });

  it("is monotonic — a higher role never has fewer permissions than a lower one", () => {
    for (const permission of PERMISSIONS) {
      for (const higher of ROLES) {
        for (const lower of ROLES) {
          if (RANK[higher] > RANK[lower] && hasPermission(lower, permission)) {
            expect(hasPermission(higher, permission)).toBe(true);
          }
        }
      }
    }
  });

  it("lets Editor create and publish, but not approve or manage the team", () => {
    expect(hasPermission("Editor", "createContent")).toBe(true);
    expect(hasPermission("Editor", "publishContent")).toBe(true);
    expect(hasPermission("Editor", "approveContent")).toBe(false);
    expect(hasPermission("Editor", "manageTeam")).toBe(false);
  });

  it("lets Manager run team and approvals, but not connect channels", () => {
    expect(hasPermission("Manager", "manageTeam")).toBe(true);
    expect(hasPermission("Manager", "createContent")).toBe(true);
    expect(hasPermission("Manager", "publishContent")).toBe(true);
    expect(hasPermission("Manager", "approveContent")).toBe(true);
    expect(hasPermission("Manager", "manageSocialAccounts")).toBe(false);
    expect(hasPermission("Manager", "manageWorkspace")).toBe(false);
  });

  it("lets Moderator create content but not publish or approve it", () => {
    expect(hasPermission("Moderator", "createContent")).toBe(true);
    expect(hasPermission("Moderator", "publishContent")).toBe(false);
    expect(hasPermission("Moderator", "approveContent")).toBe(false);
    expect(hasPermission("Moderator", "manageTeam")).toBe(false);
  });

  it("reserves workspace and monetization management for Owner only", () => {
    for (const role of ["Admin", "Manager", "Editor", "Moderator", "Analyst", "Viewer"] as const) {
      expect(hasPermission(role, "manageWorkspace")).toBe(false);
      expect(hasPermission(role, "manageMonetization")).toBe(false);
    }
  });

  it("covers all seven roles with no unexpected gaps", () => {
    expect(ROLES).toEqual([
      "Owner",
      "Admin",
      "Manager",
      "Editor",
      "Moderator",
      "Analyst",
      "Viewer",
    ]);
  });
});
