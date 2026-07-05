import { TeamBoard } from "@/components/team/team-board";
import { getWorkspaceTeamMembers } from "@/lib/team-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace, userId } = await requireWorkspaceAccess(workspaceSlug);
  const members = await getWorkspaceTeamMembers(workspace.id);

  return (
    <TeamBoard
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      currentUserId={userId}
      initialMembers={members}
    />
  );
}
