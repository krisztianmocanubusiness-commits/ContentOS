"use client";

import * as React from "react";

import { workspaces as seedWorkspaces, type Workspace } from "@/lib/mock-data";

const STORAGE_KEY = "content-os:active-workspace";
const CHANGE_EVENT = "content-os:workspace-change";

type WorkspaceContextValue = {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string) => Workspace;
};

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "WS";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function subscribeToStoredWorkspaceId(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getStoredWorkspaceId() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerStoredWorkspaceId() {
  return null;
}

function writeStoredWorkspaceId(id: string) {
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>(seedWorkspaces);
  const storedWorkspaceId = React.useSyncExternalStore(
    subscribeToStoredWorkspaceId,
    getStoredWorkspaceId,
    getServerStoredWorkspaceId
  );

  const activeWorkspace =
    workspaces.find((w) => w.id === storedWorkspaceId) ?? workspaces[0];

  const setActiveWorkspaceId = React.useCallback((id: string) => {
    writeStoredWorkspaceId(id);
  }, []);

  const createWorkspace = React.useCallback(
    (name: string) => {
      const workspace: Workspace = {
        id: `${slugify(name) || "workspace"}-${Date.now().toString(36)}`,
        name,
        plan: "Free",
        initials: initialsFromName(name),
      };
      setWorkspaces((prev) => [...prev, workspace]);
      setActiveWorkspaceId(workspace.id);
      return workspace;
    },
    [setActiveWorkspaceId]
  );

  const value = React.useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      setActiveWorkspaceId,
      createWorkspace,
    }),
    [workspaces, activeWorkspace, setActiveWorkspaceId, createWorkspace]
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
