import { ContentBoard } from "@/components/content/content-board";
import { getWorkspaceContent } from "@/lib/content-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  const items = await getWorkspaceContent(workspace.id);

  return <ContentBoard workspaceName={workspace.name} initialItems={items} />;
}
