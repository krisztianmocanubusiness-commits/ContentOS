"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import type { TeamRole, Workspace } from "@/lib/mock-data";

type Membership = Workspace & { role: TeamRole };

type WorkspaceContextValue = {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  /**
   * Defaults to the caller's real role for the active workspace (from
   * WorkspaceMembership). Overriding it here only changes what the UI
   * *shows* — a demo/QA aid for previewing permission gating, not a real
   * permission change. The override is scoped to the workspace it was
   * set for, so switching workspaces falls back to the real role again.
   */
  currentRole: TeamRole;
  setCurrentRole: (role: TeamRole) => void;
};

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

/** Swaps the /w/[slug] segment of a path, e.g. /w/keris/content -> /w/buildible/content. */
function withWorkspaceSlug(pathname: string, slug: string): string {
  if (/^\/w\/[^/]+/.test(pathname)) {
    return pathname.replace(/^\/w\/[^/]+/, `/w/${slug}`);
  }
  return `/w/${slug}/dashboard`;
}

/**
 * Fetches the signed-in user's real workspaces from the database and
 * only renders `children` once that's known — every workspace a user can
 * see and act in comes from their actual WorkspaceMembership rows now,
 * not a static list every signed-in session used to share. The *active*
 * workspace is whatever /w/[workspaceSlug] segment is in the URL, not
 * client-only state — so two tabs (or two shared links) can have two
 * different workspaces open at once.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = React.useState<Membership[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/workspaces")
      .then((res) => (res.ok ? res.json() : { workspaces: [] }))
      .then((data: { workspaces: Membership[] }) => {
        if (!cancelled) setMemberships(data.workspaces ?? []);
      })
      .catch(() => {
        if (!cancelled) setMemberships([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (memberships === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your workspaces…
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-background text-center">
        <p className="text-sm font-medium">No workspaces yet</p>
        <p className="text-sm text-muted-foreground">
          Your account isn&apos;t a member of any workspace.
        </p>
      </div>
    );
  }

  return (
    <WorkspaceProviderReady
      memberships={memberships}
      onCreated={(w) => setMemberships((prev) => [...(prev ?? []), w])}
    >
      {children}
    </WorkspaceProviderReady>
  );
}

function WorkspaceProviderReady({
  memberships,
  onCreated,
  children,
}: {
  memberships: Membership[];
  onCreated: (membership: Membership) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ workspaceSlug?: string }>();
  const [roleOverride, setRoleOverride] = React.useState<{ workspaceId: string; role: TeamRole } | null>(null);

  const workspaces = React.useMemo<Workspace[]>(
    () =>
      memberships.map((m) => ({ id: m.id, slug: m.slug, name: m.name, plan: m.plan, initials: m.initials })),
    [memberships]
  );

  const activeMembership =
    memberships.find((m) => m.slug === params.workspaceSlug) ?? memberships[0];
  const activeWorkspace: Workspace = activeMembership;

  const currentRole =
    roleOverride?.workspaceId === activeWorkspace.id
      ? roleOverride.role
      : activeMembership.role;

  const setActiveWorkspaceId = React.useCallback(
    (id: string) => {
      const target = memberships.find((m) => m.id === id);
      if (!target) return;
      router.push(withWorkspaceSlug(pathname, target.slug));
    },
    [memberships, pathname, router]
  );

  const setCurrentRole = React.useCallback(
    (role: TeamRole) => {
      setRoleOverride({ workspaceId: activeWorkspace.id, role });
    },
    [activeWorkspace.id]
  );

  const createWorkspace = React.useCallback(
    async (name: string) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      const { workspace } = (await res.json()) as { workspace: Membership };
      onCreated(workspace);
      router.push(`/w/${workspace.slug}/dashboard`);
      return workspace;
    },
    [onCreated, router]
  );

  const value = React.useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      setActiveWorkspaceId,
      createWorkspace,
      currentRole,
      setCurrentRole,
    }),
    [workspaces, activeWorkspace, setActiveWorkspaceId, createWorkspace, currentRole, setCurrentRole]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
