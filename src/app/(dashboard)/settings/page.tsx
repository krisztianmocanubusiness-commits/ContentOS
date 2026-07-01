"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useTheme } from "next-themes";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { currentUser, socialAccounts as seedSocialAccounts } from "@/lib/mock-data";
import { platformAbbr, platformColor } from "@/lib/platform";
import { useMounted } from "@/hooks/use-mounted";
import { useWorkspace } from "@/context/workspace-context";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const { activeWorkspace } = useWorkspace();
  const [accounts, setAccounts] = React.useState(seedSocialAccounts);
  const workspaceAccounts = accounts.filter(
    (account) => account.workspaceId === activeWorkspace.id
  );

  function toggleAccountStatus(id: string) {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? {
              ...account,
              status:
                account.status === "Connected" ? "Not Connected" : "Connected",
            }
          : account
      )
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and workspace preferences." />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="social">Social Accounts</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This information will be displayed to your teammates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-primary/10 text-lg text-primary">
                    {currentUser.initials}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  Change avatar
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" defaultValue={currentUser.name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={currentUser.email} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-border pt-6">
              <Button>Save changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="workspace">
          <Card key={activeWorkspace.id}>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>
                Update this workspace&apos;s name and default settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workspaceName">Workspace name</Label>
                <Input id="workspaceName" defaultValue={activeWorkspace.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workspaceUrl">Workspace URL</Label>
                <Input
                  id="workspaceUrl"
                  defaultValue={`app.contentos.io/${activeWorkspace.id}`}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-border pt-6">
              <Button>Save changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social accounts</CardTitle>
              <CardDescription>
                Channels connected to {activeWorkspace.name}. Every workspace
                manages its own accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {workspaceAccounts.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No social accounts connected yet.
                </p>
              ) : (
                workspaceAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${platformColor[account.platform]}`}
                      >
                        {platformAbbr[account.platform]}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {account.platform}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {account.handle} · {account.followers} followers
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          account.status === "Connected" ? "success" : "outline"
                        }
                      >
                        {account.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAccountStatus(account.id)}
                      >
                        {account.status === "Connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="justify-end border-t border-border pt-6">
              <Button variant="outline" size="sm">
                <Plus />
                Connect account
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {[
                {
                  title: "Content approvals",
                  description: "When a draft needs your review",
                },
                {
                  title: "Scheduled posts",
                  description: "Reminders before a post goes live",
                },
                {
                  title: "Team activity",
                  description: "When teammates comment or make changes",
                },
                {
                  title: "Weekly summary",
                  description: "A digest of performance every Monday",
                },
              ].map((item, idx) => (
                <div key={item.title} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                  <Switch defaultChecked={idx !== 2} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Content OS looks on your device.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(["light", "dark", "system"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={
                    "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm capitalize transition-colors " +
                    (mounted && theme === option
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-accent/50")
                  }
                >
                  {option}
                  {mounted && theme === option && (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
