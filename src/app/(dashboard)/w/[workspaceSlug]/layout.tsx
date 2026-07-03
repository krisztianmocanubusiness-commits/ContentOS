import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  // Not yet used to render anything here — this call is the enforcement
  // point. It 404s before any page in this subtree renders if the caller
  // doesn't have a real WorkspaceMembership for this slug, covering pages
  // that haven't been migrated to fetch their own data server-side yet.
  await requireWorkspaceAccess(workspaceSlug);

  return children;
}
