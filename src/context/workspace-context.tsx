"use client";

import * as React from "react";

import type { TeamRole, Workspace } from "@/lib/mock-data";

const ACTIVE_KEY = "content-os:active-workspace";
const CHANGE_EVENT = "content-os:workspace-change";

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

function subscribeToActiveId(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getStoredActiveId() {
  return window.localStorage.getItem(ACTIVE_KEY);
}

function getServerStoredActiveId() {
  return null;
}

function writeActiveId(id: string) {
  window.localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Fetches the signed-in user's real workspaces from the database and
 * only renders `children` once that's known — every workspace a user can
 * see and act in comes from their actual WorkspaceMembership rows now,
 * not a static list every signed-in session used to share.
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

  return <WorkspaceProviderReady memberships={memberships} onCreated={(w) => setMemberships((prev) => [...(prev ?? []), w])}>{children}</WorkspaceProviderReady>;
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
  const [roleOverride, setRoleOverride] = React.useState<{ workspaceId: string; role: TeamRole } | null>(null);
  const storedActiveId = React.useSyncExternalStore(
    subscribeToActiveId,
    getStoredActiveId,
    getServerStoredActiveId
  );

  const workspaces = React.useMemo<Workspace[]>(
    () =>
      memberships.map((m) => ({ id: m.id, name: m.name, plan: m.plan, initials: m.initials })),
    [memberships]
  );

  const activeMembership =
    memberships.find((m) => m.id === storedActiveId) ?? memberships[0];
  const activeWorkspace: Workspace = activeMembership;

  const currentRole =
    roleOverride?.workspaceId === activeWorkspace.id
      ? roleOverride.role
      : activeMembership.role;

  const setActiveWorkspaceId = React.useCallback((id: string) => {
    writeActiveId(id);
  }, []);

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
      setActiveWorkspaceId(workspace.id);
      return workspace;
    },
    [onCreated, setActiveWorkspaceId]
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
