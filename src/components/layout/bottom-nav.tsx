"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { cn } from "@/lib/utils";
import { mobilePrimaryNavItems, mobileMoreNavItems, bottomNavItems } from "@/lib/nav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NavLinks } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { useWorkspace } from "@/context/workspace-context";

const moreItems = [...mobileMoreNavItems, ...bottomNavItems];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = moreItems.some((item) =>
    isActivePath(pathname, `/w/${activeWorkspace.slug}${item.href}`)
  );

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {mobilePrimaryNavItems.map((item) => {
          const href = `/w/${activeWorkspace.slug}${item.href}`;
          const isActive = isActivePath(pathname, href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.title}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <VisuallyHidden>
            <SheetTitle>More</SheetTitle>
          </VisuallyHidden>
          <div className="flex flex-col gap-4 p-4">
            <WorkspaceSwitcher />
            <Separator />
            <NavLinks items={mobileMoreNavItems} onNavigate={() => setMoreOpen(false)} />
            <Separator />
            <NavLinks items={bottomNavItems} onNavigate={() => setMoreOpen(false)} />
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
