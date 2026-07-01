import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WorkspaceProvider } from "@/context/workspace-context";

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
