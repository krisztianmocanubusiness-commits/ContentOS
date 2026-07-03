"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { navItems, bottomNavItems } from "@/lib/nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { NavLinks } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/context/workspace-context";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="flex h-full flex-col gap-4 bg-sidebar p-3">
      <Link href={`/w/${activeWorkspace.slug}/dashboard`} className="flex items-center gap-2 px-1 pt-1">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Content OS
        </span>
      </Link>

      <WorkspaceSwitcher />

      <Separator className="bg-sidebar-border" />

      <div className="flex-1 overflow-y-auto">
        <NavLinks items={navItems} onNavigate={onNavigate} />
      </div>

      <div className="flex flex-col gap-2">
        <NavLinks items={bottomNavItems} onNavigate={onNavigate} />
        <Separator className="bg-sidebar-border" />
        <UserMenu />
      </div>
    </div>
  );
}
