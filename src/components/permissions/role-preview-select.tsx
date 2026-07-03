"use client";

import { Eye } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/context/workspace-context";
import { ROLES } from "@/lib/permissions";
import type { TeamRole } from "@/lib/mock-data";

export function RolePreviewSelect() {
  const { currentRole, setCurrentRole } = useWorkspace();

  return (
    <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as TeamRole)}>
      <SelectTrigger className="w-44">
        <Eye className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            Viewing as {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
