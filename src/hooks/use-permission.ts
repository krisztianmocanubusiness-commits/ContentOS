"use client";

import { useWorkspace } from "@/context/workspace-context";
import { hasPermission, type Permission } from "@/lib/permissions";

export function usePermission(permission: Permission): boolean {
  const { currentRole } = useWorkspace();
  return hasPermission(currentRole, permission);
}
