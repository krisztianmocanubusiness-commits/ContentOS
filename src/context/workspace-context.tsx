"use client";

import * as React from "react";

import { workspaces as seedWorkspaces, type Workspace } from "@/lib/mock-data";

const ACTIVE_KEY = "content-os:active-workspace";
const CUSTOM_KEY = "content-os:custom-workspaces";
const CHANGE_EVENT = "content-os:workspace-change";

const EMPTY_WORKSPACES: Workspace[] = [];

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

function subscribeToWorkspaceStore(callback: () => void) {
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

// useSyncExternalStore requires a stable reference when the underlying
// value hasn't changed, so parsed JSON is cached keyed on the raw string.
let cachedRaw: string | null = null;
let cachedCustomWorkspaces: Workspace[] = EMPTY_WORKSPACES;

function getStoredCustomWorkspaces(): Workspace[] {
  const raw = window.localStorage.getItem(CUSTOM_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedCustomWorkspaces = raw ? (JSON.parse(raw) as Workspace[]) : EMPTY_WORKSPACES;
    } catch {
      cachedCustomWorkspaces = EMPTY_WORKSPACES;
    }
  }
  return cachedCustomWorkspaces;
}

function getServerStoredCustomWorkspaces() {
  return EMPTY_WORKSPACES;
}

function writeActiveId(id: string) {
  window.localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeCustomWorkspaces(list: Workspace[]) {
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const storedActiveId = React.useSyncExternalStore(
    subscribeToWorkspaceStore,
    getStoredActiveId,
    getServerStoredActiveId
  );
  const customWorkspaces = React.useSyncExternalStore(
    subscribeToWorkspaceStore,
    getStoredCustomWorkspaces,
    getServerStoredCustomWorkspaces
  );

  const workspaces = React.useMemo(
    () => [...seedWorkspaces, ...customWorkspaces],
    [customWorkspaces]
  );

  const activeWorkspace =
    workspaces.find((w) => w.id === storedActiveId) ?? workspaces[0];

  const setActiveWorkspaceId = React.useCallback((id: string) => {
    writeActiveId(id);
  }, []);

  const createWorkspace = React.useCallback(
    (name: string) => {
      const workspace: Workspace = {
        id: `${slugify(name) || "workspace"}-${Date.now().toString(36)}`,
        name,
        plan: "Free",
        initials: initialsFromName(name),
      };
      writeCustomWorkspaces([...getStoredCustomWorkspaces(), workspace]);
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
