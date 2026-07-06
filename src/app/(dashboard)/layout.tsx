import type { Metadata } from "next";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WorkspaceProvider } from "@/context/workspace-context";

// Defense-in-depth on top of robots.ts: a <meta name="robots"> tag holds
// even if a page gets linked/discovered from somewhere robots.txt can't
// reach (robots.txt is advisory; this isn't). Everything under here is
// per-tenant workspace data behind auth — never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
