import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  analyticsSummary,
  calendarEvents,
  contentItems,
  currentUser,
} from "@/lib/mock-data";
import { statusVariant } from "@/lib/status";

export default function DashboardPage() {
  const upcoming = calendarEvents.slice(0, 4);
  const recent = contentItems.slice(0, 5);
  const firstName = currentUser.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening across your workspace."
        action={
          <Button asChild>
            <Link href="/content">
              <Plus />
              New content
            </Link>
          </Button>
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
                <span className="text-muted-foreground">vs last month</span>
              </span>
            </CardContent>
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
              <Link href="/content">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {recent.map((item) => (
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
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>Next scheduled posts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {upcoming.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
              >
                <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md border border-border text-xs font-semibold leading-none">
                  <span>Jul</span>
                  <span>{event.day}</span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {event.time} · {event.platform}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
