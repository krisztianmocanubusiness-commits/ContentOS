"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { navItems, bottomNavItems } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Sidebar } from "@/components/layout/sidebar";
import * as React from "react";

const allItems = [...navItems, ...bottomNavItems];

export function Topbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const active = allItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
      </Sheet>

      <h1 className="text-sm font-medium text-foreground md:text-base">
        {active?.title ?? "Content OS"}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
