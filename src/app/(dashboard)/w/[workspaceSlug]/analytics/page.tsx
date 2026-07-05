import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnalyticsRangeSelect } from "@/components/analytics/analytics-range-select";
import { BarChart } from "@/components/analytics/bar-chart";
import { CategoryBreakdown } from "@/components/analytics/category-breakdown";
import {
  getWorkspaceAnalytics,
  type AnalyticsRange,
  type PeriodCount,
} from "@/lib/analytics-data";
import { platformColor } from "@/lib/platform";
import { statusBarColor } from "@/lib/status";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const REVIEW_ACTION_LABEL: Record<string, string> = {
  submitted: "submitted",
  approved: "approved",
  changes_requested: "requested changes on",
};

function computeTrend(current: number, previous: number): { label: string; direction: "up" | "down" | "flat" } {
  if (previous === 0) {
    return current === 0 ? { label: "—", direction: "flat" } : { label: "New", direction: "up" };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  if (pct === 0) return { label: "No change", direction: "flat" };
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, direction: pct > 0 ? "up" : "down" };
}

function TrendTile({ label, stat }: { label: string; stat: PeriodCount }) {
  const trend = computeTrend(stat.current, stat.previous);
  return (
    <Card className="w-36 shrink-0 gap-3 py-4 sm:w-auto sm:gap-6 sm:py-6">
      <CardHeader className="gap-1 px-4 sm:px-6">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl font-semibold sm:text-2xl">{stat.current}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 sm:px-6">
        <span
          className={
            "inline-flex items-center gap-1 text-xs font-medium " +
            (trend.direction === "up"
              ? "text-success"
              : trend.direction === "down"
                ? "text-destructive"
                : "text-muted-foreground")
          }
        >
          {trend.direction === "up" && <ArrowUpRight className="size-3.5" />}
          {trend.direction === "down" && <ArrowDownRight className="size-3.5" />}
          {trend.label}
        </span>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { range: rawRange } = await searchParams;
  const range: AnalyticsRange =
    rawRange === "7d" || rawRange === "30d" || rawRange === "90d" ? rawRange : "30d";

  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  const data = await getWorkspaceAnalytics(workspace.id, range);

  const hasPostingActivity = data.postingFrequency.some((b) => b.value > 0);
  const hasReviewPipelineActivity =
    data.reviewPipeline.submitted > 0 ||
    data.reviewPipeline.approved > 0 ||
    data.reviewPipeline.changesRequested > 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`Track ${workspace.name}'s content operations over time.`}
        action={<AnalyticsRangeSelect workspaceSlug={workspaceSlug} currentRange={range} />}
      />

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        <TrendTile label="Total content" stat={data.statusSummary.total} />
        <TrendTile label="Drafts" stat={data.statusSummary.draft} />
        <TrendTile label="Scheduled" stat={data.statusSummary.scheduled} />
        <TrendTile label="Published" stat={data.statusSummary.published} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Posting frequency</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {hasPostingActivity ? (
              <BarChart data={data.postingFrequency} unitLabel="posts" />
            ) : (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Not enough data yet for this period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content by platform</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.contentByPlatform.length === 0 ? (
              <p className="text-sm text-muted-foreground">No content yet in this period.</p>
            ) : (
              <CategoryBreakdown
                data={data.contentByPlatform.map((row) => ({
                  label: row.label,
                  value: row.count,
                  colorClassName: platformColor[row.label],
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content by status</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.contentByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No content yet in this period.</p>
            ) : (
              <CategoryBreakdown
                data={data.contentByStatus.map((row) => ({
                  label: row.label,
                  value: row.count,
                  colorClassName: statusBarColor[row.label],
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content by tag</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.contentByTag.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tagged content yet in this period.</p>
            ) : (
              <CategoryBreakdown
                data={data.contentByTag.map((row) => ({ label: `#${row.label}`, value: row.count }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Review pipeline</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {hasReviewPipelineActivity ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Submitted</span>
                  <span className="text-sm font-medium">{data.reviewPipeline.submitted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <span className="text-sm font-medium">{data.reviewPipeline.approved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Changes requested</span>
                  <span className="text-sm font-medium">{data.reviewPipeline.changesRequested}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data yet for this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval turnaround</CardTitle>
            <CardDescription>Avg. time from submission to decision</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.approvalTurnaround.averageHours === null ? (
              <p className="text-sm text-muted-foreground">Not enough data yet.</p>
            ) : (
              <>
                <p className="text-2xl font-semibold">
                  {data.approvalTurnaround.averageHours < 1
                    ? `${Math.round(data.approvalTurnaround.averageHours * 60)}m`
                    : `${data.approvalTurnaround.averageHours.toFixed(1)}h`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across {data.approvalTurnaround.sampleSize}{" "}
                  {data.approvalTurnaround.sampleSize === 1 ? "review" : "reviews"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace growth</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Team members</span>
              <span className="text-sm font-medium">{data.workspaceGrowth.totalMembers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New this period</span>
              <span className="text-sm font-medium">+{data.workspaceGrowth.newMembers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Calendar posts</span>
              <span className="text-sm font-medium">{data.calendarActivity.current}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Review activity</CardTitle>
          <CardDescription>{data.rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          {data.reviewActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No review activity yet in this period.</p>
          ) : (
            data.reviewActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5 px-2 text-sm">
                <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <p className="min-w-0 flex-1 text-muted-foreground">
                  <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                  {REVIEW_ACTION_LABEL[entry.action] ?? entry.action}
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

      <Card className="mt-6 hidden overflow-hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team member</TableHead>
              <TableHead>Actions in period</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.teamContribution.map((member) => (
              <TableRow key={member.userId}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    {member.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{member.actionCount}</TableCell>
              </TableRow>
            ))}
            {data.teamContribution.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                  No team activity yet in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-6 flex flex-col gap-3 md:hidden">
        <h3 className="text-sm font-medium text-muted-foreground">Team contribution</h3>
        {data.teamContribution.length === 0 ? (
          <Card className="py-10 text-center text-sm text-muted-foreground">
            No team activity yet in this period.
          </Card>
        ) : (
          data.teamContribution.map((member) => (
            <Card key={member.userId} className="flex flex-row items-center gap-3 p-4">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{member.name}</span>
                <span className="text-xs text-muted-foreground">
                  {member.actionCount} {member.actionCount === 1 ? "action" : "actions"}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
