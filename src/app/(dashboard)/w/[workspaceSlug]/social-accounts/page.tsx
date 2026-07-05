import { SocialAccountsBoard } from "@/components/social/social-accounts-board";
import { getWorkspaceSocialAccounts } from "@/lib/social-account-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function SocialAccountsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  const accounts = await getWorkspaceSocialAccounts(workspace.id);

  return (
    <SocialAccountsBoard
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      initialAccounts={accounts}
    />
  );
}
