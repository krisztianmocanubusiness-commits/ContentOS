import { MonetizationBoard } from "@/components/monetization/monetization-board";
import { getMonetizationEntries, getMonetizationOverview } from "@/lib/monetization-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function MonetizationPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);

  const [overview, entries] = await Promise.all([
    getMonetizationOverview(workspace.id),
    getMonetizationEntries(workspace.id),
  ]);

  return (
    <MonetizationBoard
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      initialOverview={overview}
      initialEntries={entries}
    />
  );
}
