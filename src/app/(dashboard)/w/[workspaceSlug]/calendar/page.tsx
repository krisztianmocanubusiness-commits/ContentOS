import { CalendarBoard } from "@/components/calendar/calendar-board";
import { getWorkspaceCalendarEvents } from "@/lib/calendar-data";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  const events = await getWorkspaceCalendarEvents(workspace.id);

  return (
    <CalendarBoard
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      initialEvents={events}
    />
  );
}
