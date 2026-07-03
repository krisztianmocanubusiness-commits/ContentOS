"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PermissionButton } from "@/components/permissions/permission-button";
import { AccountDetailDialog } from "@/components/social/account-detail-dialog";
import { ConnectAccountDialog } from "@/components/social/connect-account-dialog";
import {
  socialAccounts as seedSocialAccounts,
  type Platform,
  type SocialAccount,
} from "@/lib/mock-data";
import { platformAbbr, platformColor } from "@/lib/platform";
import { useWorkspace } from "@/context/workspace-context";

export default function SocialAccountsPage() {
  const { activeWorkspace } = useWorkspace();
  const [accounts, setAccounts] = React.useState(seedSocialAccounts);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [connectOpen, setConnectOpen] = React.useState(false);
  const workspaceAccounts = accounts.filter(
    (account) => account.workspaceId === activeWorkspace.id
  );

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? null;

  function toggleAccountStatus(id: string) {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? {
              ...account,
              status:
                account.status === "Connected" ? "Not Connected" : "Connected",
              lastSynced: account.status === "Connected" ? account.lastSynced : "Just now",
            }
          : account
      )
    );
  }

  function connectAccount(input: { platform: Platform; handle: string }) {
    const newAccount: SocialAccount = {
      id: `s-${Date.now().toString(36)}`,
      workspaceId: activeWorkspace.id,
      platform: input.platform,
      handle: input.handle,
      followers: "0",
      status: "Connected",
      connectedSince: "Just now",
      lastSynced: "Just now",
    };
    setAccounts((prev) => [newAccount, ...prev]);
  }

  return (
    <div>
      <PageHeader
        title="Social Accounts"
        description={`Channels connected to ${activeWorkspace.name}. Every workspace manages its own accounts.`}
        action={
          <PermissionButton
            permission="manageSocialAccounts"
            onClick={() => setConnectOpen(true)}
          >
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
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${platformColor[account.platform]}`}
                  >
                    {platformAbbr[account.platform]}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">
                      {account.platform}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {account.handle} · {account.followers} followers
                    </span>
                  </div>
                </button>
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

      <AccountDetailDialog
        account={selectedAccount}
        open={selectedAccount !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAccountId(null);
        }}
      />

      <ConnectAccountDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnect={connectAccount}
      />
    </div>
  );
}
