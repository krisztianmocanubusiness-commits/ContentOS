"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { workspaces as initialWorkspaces, type Workspace } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceSwitcher() {
  const [workspaces] = React.useState<Workspace[]>(initialWorkspaces);
  const [activeId, setActiveId] = React.useState(workspaces[0].id);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-2 text-left text-sm transition-colors",
            "hover:bg-sidebar-accent"
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {active.initials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm leading-tight font-medium text-sidebar-foreground">
              {active.name}
            </span>
            <span className="truncate text-xs leading-tight text-muted-foreground">
              {active.plan} plan
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => setActiveId(workspace.id)}
            className="gap-2"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">
              {workspace.initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{workspace.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {workspace.plan} plan
              </span>
            </span>
            {workspace.id === activeId && (
              <Check className="size-4 shrink-0 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-muted-foreground">
          <Plus className="size-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
