"use client";

import { usePathname } from "next/navigation";

import { navItems, bottomNavItems } from "@/lib/nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const allItems = [...navItems, ...bottomNavItems];

export function Topbar() {
  const pathname = usePathname();
  const active = allItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60 md:px-6">
      <h1 className="text-sm font-medium text-foreground md:text-base">
        {active?.title ?? "Content OS"}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
