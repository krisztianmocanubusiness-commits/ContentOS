import { InboxBoard } from "@/components/inbox/inbox-board";
import {
  getAssignableMembers,
  getWorkspaceConversationCounts,
  getWorkspaceConversations,
} from "@/lib/inbox-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);

  const [{ items, nextCursor }, counts, members] = await Promise.all([
    getWorkspaceConversations(workspace.id),
    getWorkspaceConversationCounts(workspace.id),
    getAssignableMembers(workspace.id),
  ]);

  return (
    <InboxBoard
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      initialConversations={items}
      initialNextCursor={nextCursor}
      initialCounts={counts}
      members={members}
    />
  );
}
