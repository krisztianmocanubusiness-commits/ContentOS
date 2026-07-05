import Link from "next/link";
import { FileText, Inbox as InboxIcon, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard-data";
import { statusVariant } from "@/lib/status";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace, userId, userName } = await requireWorkspaceAccess(workspaceSlug);
  const data = await getDashboardData(workspace.id, userId);
  const firstName = userName.split(" ")[0] ?? "";

  const statTiles = [
    { label: "Total content", value: data.statusCounts.total },
    { label: "Drafts", value: data.statusCounts.draft },
    { label: "In Review", value: data.statusCounts.needsReview },
    { label: "Scheduled", value: data.statusCounts.scheduled },
    { label: "Published", value: data.statusCounts.published },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`Here's what's happening in ${workspace.name}.`}
        action={
          <Button asChild>
            <Link href={`/w/${workspaceSlug}/content`}>
              <Plus />
              New content
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statTiles.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent content</CardTitle>
              <CardDescription>Latest updates across your pipeline</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/w/${workspaceSlug}/content`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {data.recentContent.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                No content yet in {workspace.name}.
              </p>
            ) : (
              data.recentContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.platform} · {item.author}
                    </span>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>Next scheduled posts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/w/${workspaceSlug}/calendar`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {data.upcomingEvents.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                Nothing scheduled yet.
              </p>
            ) : (
              data.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md border border-border text-xs font-semibold leading-none">
                    <span>
                      {event.scheduledAt.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span>{event.scheduledAt.getDate()}</span>
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.scheduledAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {event.platform}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>Content waiting on a reviewer</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/w/${workspaceSlug}/content`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {data.pendingApprovals.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                Nothing needs review right now.
              </p>
            ) : (
              data.pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.platform} · {item.author}
                    </span>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <InboxIcon className="size-4 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>What your teammates have been doing</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {data.notifications.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                No new notifications.
              </p>
            ) : (
              data.notifications.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2.5 px-2 text-sm">
                  <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 flex-1 text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                    {entry.verb}
                    {entry.contentTitle && (
                      <>
                        {" "}
                        <span className="text-foreground">&ldquo;{entry.contentTitle}&rdquo;</span>
                      </>
                    )}
                    <span className="block text-xs">{entry.timestamp}</span>
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Every action across {workspace.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {data.recentActivity.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              data.recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2.5 px-2 text-sm">
                  <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <p className="min-w-0 flex-1 text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                    {entry.verb}
                    {entry.contentTitle && (
                      <>
                        {" "}
                        <span className="text-foreground">&ldquo;{entry.contentTitle}&rdquo;</span>
                      </>
                    )}
                    <span className="block text-xs">{entry.timestamp}</span>
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              {data.workspaceStats.teamMemberCount}{" "}
              {data.workspaceStats.teamMemberCount === 1 ? "member" : "members"} ·{" "}
              {workspace.plan} plan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {data.team.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{member.role}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {member.lastActive ?? "No activity yet"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Workspace statistics</CardTitle>
            <CardDescription>{workspace.name} at a glance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium">{workspace.plan}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-muted-foreground">Team members</span>
              <span className="text-sm font-medium">{data.workspaceStats.teamMemberCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-muted-foreground">Total content</span>
              <span className="text-sm font-medium">{data.workspaceStats.totalContent}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
