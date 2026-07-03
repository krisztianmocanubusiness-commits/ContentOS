import { describe, expect, it } from "vitest";

import { hasPermission, PERMISSION_LABELS, ROLES, type Permission } from "./permissions";

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];
const RANK: Record<(typeof ROLES)[number], number> = { Viewer: 0, Editor: 1, Admin: 2, Owner: 3 };

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

  it("reserves workspace and monetization management for Owner only", () => {
    for (const role of ["Admin", "Editor", "Viewer"] as const) {
      expect(hasPermission(role, "manageWorkspace")).toBe(false);
      expect(hasPermission(role, "manageMonetization")).toBe(false);
    }
  });
});
