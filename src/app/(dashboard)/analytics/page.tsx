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
import { analyticsSummary, topPosts } from "@/lib/mock-data";

const chartBars = [42, 58, 51, 66, 60, 74, 69, 80, 72, 88, 84, 96];

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Track performance across your content and channels."
        action={
          <Select defaultValue="30d">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsSummary.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
            <CardDescription>Last 12 weeks</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex h-48 items-end gap-2">
              {chartBars.map((value, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-t-sm bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top posts</CardTitle>
            <CardDescription>By total reach this period</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {topPosts.map((post) => (
              <div key={post.id} className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{post.title}</span>
                <span className="text-xs text-muted-foreground">
                  {post.platform} · {post.reach} reach · {post.engagement} engagement
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
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
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
