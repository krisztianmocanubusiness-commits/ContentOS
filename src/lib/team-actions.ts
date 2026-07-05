"use server";

import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { AuditAction, MemberStatus, TeamRole as DbTeamRole } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { initialsFromName } from "@/lib/naming";
import { hasPermission, ROLES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { TeamMemberRow } from "@/lib/team-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const VALID_ROLES = new Set<string>(ROLES);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isSerializationFailure(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") return true;
  // A write conflict detected at COMMIT time (rather than mid-statement)
  // surfaces as the driver adapter's own error instead of being translated
  // into a PrismaClientKnownRequestError — same underlying Postgres 40001
  // serialization_failure, just not mapped to P2034 by this Prisma version.
  const raw = err as { name?: string; cause?: { kind?: string } };
  return raw?.name === "DriverAdapterError" && raw.cause?.kind === "TransactionWriteConflict";
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Derives a display name from an email's local-part, e.g. "ava.reyes@x.com" -> "Ava Reyes". */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local.split(/[.\-_]+/).filter(Boolean);
  if (words.length === 0) return email;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function toTeamMemberRow(membership: {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: { name: string; email: string; initials: string };
}): TeamMemberRow {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role as TeamMemberRow["role"],
    status: membership.status as TeamMemberRow["status"],
    initials: membership.user.initials,
    lastActive: null,
  };
}

export async function inviteMemberAction(
  workspaceSlug: string,
  input: { email: string; role: string }
): Promise<ActionResult<TeamMemberRow>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageTeam")) {
    return { ok: false, error: "Your role can't manage the team.", code: "forbidden" };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address.", code: "invalid" };
  }
  if (!VALID_ROLES.has(input.role)) {
    return { ok: false, error: "Choose a valid role.", code: "invalid" };
  }
  const inviteRole = input.role as DbTeamRole;

  const existingMembership = await prisma.workspaceMembership.findFirst({
    where: { workspaceId: workspace.id, user: { email } },
    select: { id: true },
  });
  if (existingMembership) {
    return { ok: false, error: "That person is already a member of this workspace.", code: "invalid" };
  }

  try {
    const membership = await prisma.$transaction(async (tx) => {
      // Reuse the User row if this email already has an account elsewhere
      // (e.g. a member of another workspace); WorkspaceMembership.userId
      // is a required FK, so there's no "invited, not yet a user" state —
      // an invite always creates a real (initially unusable) User row.
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        const name = nameFromEmail(email);
        const placeholderHash = await bcrypt.hash(randomUUID(), 10);
        user = await tx.user.create({
          data: {
            id: randomUUID(),
            name,
            email,
            passwordHash: placeholderHash,
            initials: initialsFromName(name),
          },
        });
      }

      const created = await tx.workspaceMembership.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          workspaceId: workspace.id,
          role: inviteRole,
          status: MemberStatus.Invited,
        },
        include: { user: { select: { name: true, email: true, initials: true } } },
      });

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          workspaceId: workspace.id,
          workspaceMembershipId: created.id,
          actorId: userId,
          actorName: userName,
          action: AuditAction.TeamMemberInvited,
          metadata: { targetEmail: email, role: inviteRole },
        },
      });

      return created;
    });

    revalidatePath(`/w/${workspaceSlug}/team`);
    return { ok: true, data: toTeamMemberRow(membership) };
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      return { ok: false, error: "That person is already a member of this workspace.", code: "conflict" };
    }
    throw err;
  }
}

export async function changeRoleAction(
  workspaceSlug: string,
  membershipId: string,
  newRole: string
): Promise<ActionResult<TeamMemberRow>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageTeam")) {
    return { ok: false, error: "Your role can't manage the team.", code: "forbidden" };
  }

  if (!VALID_ROLES.has(newRole)) {
    return { ok: false, error: "Choose a valid role.", code: "invalid" };
  }
  const targetRole = newRole as DbTeamRole;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.workspaceMembership.findFirst({
          where: { id: membershipId, workspaceId: workspace.id },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            user: { select: { name: true, email: true, initials: true } },
          },
        });
        if (!existing) return { kind: "not_found" as const };

        // Self-role-edits are blocked entirely — even an Owner with
        // co-owners can't change their own role here — since any self-edit
        // through this endpoint is a conflict of interest a teammate
        // should perform instead. This is independent of (and stricter
        // than) the final-owner guard below, which covers someone *else*
        // demoting the last Owner.
        if (existing.userId === userId) return { kind: "self" as const };

        if (existing.role === targetRole) {
          return { kind: "ok" as const, membership: existing };
        }

        if (existing.role === DbTeamRole.Owner && targetRole !== DbTeamRole.Owner) {
          const ownerCount = await tx.workspaceMembership.count({
            where: { workspaceId: workspace.id, role: DbTeamRole.Owner, status: MemberStatus.Active },
          });
          if (ownerCount <= 1) return { kind: "final_owner" as const };
        }

        const updated = await tx.workspaceMembership.update({
          where: { id: membershipId },
          data: { role: targetRole },
          include: { user: { select: { name: true, email: true, initials: true } } },
        });

        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            workspaceId: workspace.id,
            workspaceMembershipId: membershipId,
            actorId: userId,
            actorName: userName,
            action: AuditAction.TeamMemberRoleChanged,
            metadata: {
              targetUserId: existing.userId,
              targetName: existing.user.name,
              fromRole: existing.role,
              toRole: targetRole,
            },
          },
        });

        return { kind: "ok" as const, membership: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.kind === "not_found") {
      return { ok: false, error: "Team member not found.", code: "not_found" };
    }
    if (result.kind === "self") {
      return { ok: false, error: "You can't change your own role.", code: "forbidden" };
    }
    if (result.kind === "final_owner") {
      return { ok: false, error: "The workspace must have at least one Owner.", code: "forbidden" };
    }

    revalidatePath(`/w/${workspaceSlug}/team`);
    return { ok: true, data: toTeamMemberRow(result.membership) };
  } catch (err) {
    if (isSerializationFailure(err)) {
      return {
        ok: false,
        error: "Someone else changed the team at the same time. Try again.",
        code: "conflict",
      };
    }
    throw err;
  }
}

export async function removeMemberAction(
  workspaceSlug: string,
  membershipId: string
): Promise<ActionResult<{ id: string }>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "manageTeam")) {
    return { ok: false, error: "Your role can't manage the team.", code: "forbidden" };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.workspaceMembership.findFirst({
          where: { id: membershipId, workspaceId: workspace.id },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            user: { select: { name: true, email: true } },
          },
        });
        if (!existing) return { kind: "not_found" as const };

        // Same rationale as changeRoleAction: you can't remove yourself
        // from the workspace via this action — a teammate has to do it.
        if (existing.userId === userId) return { kind: "self" as const };

        if (existing.role === DbTeamRole.Owner && existing.status === MemberStatus.Active) {
          const ownerCount = await tx.workspaceMembership.count({
            where: { workspaceId: workspace.id, role: DbTeamRole.Owner, status: MemberStatus.Active },
          });
          if (ownerCount <= 1) return { kind: "final_owner" as const };
        }

        // Audit row written before the delete so the FK is still valid;
        // onDelete: SetNull then clears it, but metadata keeps the
        // person's name/email/role readable in the trail afterward.
        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            workspaceId: workspace.id,
            workspaceMembershipId: existing.id,
            actorId: userId,
            actorName: userName,
            action: AuditAction.TeamMemberRemoved,
            metadata: {
              targetUserId: existing.userId,
              targetName: existing.user.name,
              targetEmail: existing.user.email,
              role: existing.role,
            },
          },
        });
        await tx.workspaceMembership.delete({ where: { id: membershipId } });

        return { kind: "ok" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.kind === "not_found") {
      return { ok: false, error: "Team member not found.", code: "not_found" };
    }
    if (result.kind === "self") {
      return { ok: false, error: "You can't remove yourself from the workspace.", code: "forbidden" };
    }
    if (result.kind === "final_owner") {
      return { ok: false, error: "The workspace must have at least one Owner.", code: "forbidden" };
    }

    revalidatePath(`/w/${workspaceSlug}/team`);
    return { ok: true, data: { id: membershipId } };
  } catch (err) {
    if (isSerializationFailure(err)) {
      return {
        ok: false,
        error: "Someone else changed the team at the same time. Try again.",
        code: "conflict",
      };
    }
    throw err;
  }
}
