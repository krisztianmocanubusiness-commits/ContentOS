"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PermissionButton } from "@/components/permissions/permission-button";
import { socialAccounts as seedSocialAccounts } from "@/lib/mock-data";
import { platformAbbr, platformColor } from "@/lib/platform";
import { useWorkspace } from "@/context/workspace-context";

export default function SocialAccountsPage() {
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
      <PageHeader
        title="Social Accounts"
        description={`Channels connected to ${activeWorkspace.name}. Every workspace manages its own accounts.`}
        action={
          <PermissionButton permission="manageSocialAccounts">
            <Plus />
            Connect account
          </PermissionButton>
        }
      />

      <Card className="overflow-hidden py-0">
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {workspaceAccounts.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No social accounts connected yet in {activeWorkspace.name}.
            </p>
          ) : (
            workspaceAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${platformColor[account.platform]}`}
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
                  <PermissionButton
                    permission="manageSocialAccounts"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAccountStatus(account.id)}
                  >
                    {account.status === "Connected" ? "Disconnect" : "Connect"}
                  </PermissionButton>
                </div>
              </div>
            ))
          )}
        </CardContent>
        {workspaceAccounts.length > 0 && (
          <CardFooter className="border-t border-border py-4">
            <p className="text-xs text-muted-foreground">
              Connections are mocked for now — real TikTok, Instagram,
              YouTube, and X integrations come later.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
