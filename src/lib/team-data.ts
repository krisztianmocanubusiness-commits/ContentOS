import "server-only";

import { cache } from "react";

import { formatRelativeTime } from "@/lib/format";
import type { TeamRole } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

export type TeamMemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "Active" | "Invited";
  initials: string;
  lastActive: string | null;
};

/**
 * Every member of a workspace, with their real role/status from
 * WorkspaceMembership and their last activity from AuditLog — the only
 * FK-backed actor-identity source in the schema, so this can't be
 * undercounted by a display-name mismatch the way authorName/byName
 * free-text fields could be.
 */
export const getWorkspaceTeamMembers = cache(
  async (workspaceId: string): Promise<TeamMemberRow[]> => {
    const [memberships, activityByActor] = await Promise.all([
      prisma.workspaceMembership.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          role: true,
          status: true,
          user: { select: { name: true, email: true, initials: true } },
        },
      }),
      prisma.auditLog.groupBy({
        by: ["actorId"],
        where: { workspaceId },
        _max: { createdAt: true },
      }),
    ]);

    const lastActiveByActor = new Map(
      activityByActor.map((entry) => [entry.actorId, entry._max.createdAt])
    );

    return memberships.map((membership) => {
      const lastActive = lastActiveByActor.get(membership.userId) ?? null;
      return {
        membershipId: membership.id,
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        status: membership.status,
        initials: membership.user.initials,
        lastActive: lastActive ? formatRelativeTime(lastActive) : null,
      };
    });
  }
);
