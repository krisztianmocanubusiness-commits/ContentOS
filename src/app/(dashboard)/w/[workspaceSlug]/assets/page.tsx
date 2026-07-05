import { AssetsBoard } from "@/components/assets/assets-board";
import { getWorkspaceAssetTags, getWorkspaceAssets, getWorkspaceFolders } from "@/lib/asset-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function AssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { view: rawView } = await searchParams;
  const view = rawView === "trash" ? "trash" : "active";

  const { workspace } = await requireWorkspaceAccess(workspaceSlug);

  const [assets, folders, tags] = await Promise.all([
    getWorkspaceAssets(workspace.id, { status: view === "trash" ? "Deleted" : "Active" }),
    getWorkspaceFolders(workspace.id),
    getWorkspaceAssetTags(workspace.id),
  ]);

  return (
    <AssetsBoard
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      initialAssets={assets}
      folders={folders}
      tags={tags}
      view={view}
    />
  );
}
