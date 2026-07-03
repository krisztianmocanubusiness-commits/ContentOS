"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReachChart } from "@/components/analytics/reach-chart";
import { PlatformBreakdown } from "@/components/analytics/platform-breakdown";
import {
  ANALYTICS_RANGES,
  analyticsForWorkspace,
  type AnalyticsRange,
} from "@/lib/mock-data";
import { useWorkspace } from "@/context/workspace-context";

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const [range, setRange] = React.useState<AnalyticsRange>("30d");
  const { summary, chart, platformBreakdown, topPosts } = analyticsForWorkspace(
    activeWorkspace.id,
    range
  );
  const rangeLabel = ANALYTICS_RANGES.find((r) => r.value === range)?.label ?? "";

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`Track ${activeWorkspace.name}'s performance across content and channels.`}
        action={
          <Select value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANALYTICS_RANGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {summary.map((stat) => (
          <Card key={stat.label} className="w-36 shrink-0 gap-3 py-4 sm:w-auto sm:gap-6 sm:py-6">
            <CardHeader className="gap-1 px-4 sm:px-6">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-xl font-semibold sm:text-2xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0 sm:px-6">
              <span
                className={
                  "inline-flex items-center gap-1 text-xs font-medium " +
                  (stat.trend === "up" ? "text-success" : "text-destructive")
                }
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {stat.change}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reach over time</CardTitle>
            <CardDescription>{rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {chart.length === 0 ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No data yet for this period.
              </p>
            ) : (
              <ReachChart data={chart} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reach by platform</CardTitle>
            <CardDescription>{rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {platformBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected accounts with data yet.
              </p>
            ) : (
              <PlatformBreakdown data={platformBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 hidden overflow-hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Top posts</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Reach</TableHead>
              <TableHead>Engagement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topPosts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {post.platform}
                </TableCell>
                <TableCell>{post.reach}</TableCell>
                <TableCell>{post.engagement}</TableCell>
              </TableRow>
            ))}
            {topPosts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  No posts published yet in {activeWorkspace.name}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-6 flex flex-col gap-3 md:hidden">
        <h3 className="text-sm font-medium text-muted-foreground">Top posts</h3>
        {topPosts.length === 0 ? (
          <Card className="py-10 text-center text-sm text-muted-foreground">
            No posts published yet in {activeWorkspace.name}.
          </Card>
        ) : (
          topPosts.map((post) => (
            <Card key={post.id} className="flex flex-col gap-1.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 font-medium">{post.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {post.platform}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {post.reach} reach · {post.engagement} engagement
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
