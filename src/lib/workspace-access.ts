import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The caller's workspace memberships, each with the workspace it grants
 * access to. This is the only place "which workspaces can this user see"
 * is decided — every page and Server Action should go through here (or
 * requireWorkspaceAccess below) rather than trusting a client-supplied
 * workspace id.
 */
export async function getCallerMemberships() {
  const session = await auth();
  if (!session?.user?.id) return { userId: null, memberships: [] as const };

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return { userId: session.user.id, memberships };
}

/**
 * Resolves a workspace slug from the URL against the caller's real
 * memberships. Call this at the top of every workspace-scoped Server
 * Component and Server Action — it's the enforcement point for "you can
 * only see/act on workspaces you actually belong to," not just a UI nicety.
 *
 * Redirects to /login if there's no session (defense in depth — proxy.ts
 * already covers this) and 404s (not a redirect) if the slug doesn't
 * resolve to one of the caller's memberships, so a guessed/stale slug
 * can't be used to probe which workspaces exist.
 *
 * Wrapped in React's cache() so the layout and a page (or several Server
 * Components on the same page) calling this for the same slug in one
 * request share a single DB round trip instead of repeating it.
 */
export const requireWorkspaceAccess = cache(async (slug: string) => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/w/${slug}`);
  }

  const membership = await prisma.workspaceMembership.findFirst({
    where: { userId: session.user.id, workspace: { slug } },
    include: { workspace: true },
  });

  if (!membership) notFound();

  return {
    userId: session.user.id,
    userName: session.user.name ?? "",
    userInitials: session.user.initials ?? "",
    workspace: membership.workspace,
    role: membership.role,
  };
});
