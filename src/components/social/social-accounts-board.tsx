"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PermissionButton } from "@/components/permissions/permission-button";
import { AccountDetailDialog } from "@/components/social/account-detail-dialog";
import { ConnectAccountDialog } from "@/components/social/connect-account-dialog";
import {
  connectAccountAction,
  disconnectAccountAction,
  getAccountDetailAction,
  reconnectAccountAction,
} from "@/lib/social-account-actions";
import type { SocialAccountDetail, SocialAccountRow } from "@/lib/social-account-data";
import type { Platform } from "@/lib/mock-data";
import { platformAbbr, platformColor } from "@/lib/platform";
import { SOCIAL_STATUS_LABEL } from "@/lib/social-account-types";
import { socialStatusVariant } from "@/lib/status";
import { usePermission } from "@/hooks/use-permission";

export function SocialAccountsBoard({
  workspaceSlug,
  workspaceName,
  initialAccounts,
}: {
  workspaceSlug: string;
  workspaceName: string;
  initialAccounts: SocialAccountRow[];
}) {
  const router = useRouter();
  const canManage = usePermission("manageSocialAccounts");

  const [accounts, setAccounts] = React.useState(initialAccounts);
  const [selectedAccount, setSelectedAccount] = React.useState<SocialAccountDetail | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [pendingAccountId, setPendingAccountId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [prevInitialAccounts, setPrevInitialAccounts] = React.useState(initialAccounts);
  if (initialAccounts !== prevInitialAccounts) {
    setPrevInitialAccounts(initialAccounts);
    setAccounts(initialAccounts);
  }

  async function openAccount(accountId: string) {
    setDetailOpen(true);
    setSelectedAccount(null);
    const detail = await getAccountDetailAction(workspaceSlug, accountId);
    setSelectedAccount(detail);
  }

  function handleConnect(input: { platform: Platform; handle: string; displayName: string }) {
    startTransition(async () => {
      const result = await connectAccountAction(workspaceSlug, input);
      if (result.ok) {
        toast.success(`Connected ${result.data.displayName}.`);
        setConnectOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggle(account: SocialAccountRow) {
    setPendingAccountId(account.id);
    startTransition(async () => {
      const result =
        account.status === "Connected"
          ? await disconnectAccountAction(workspaceSlug, account.id)
          : await reconnectAccountAction(workspaceSlug, account.id);
      if (result.ok) {
        toast.success(
          account.status === "Connected"
            ? `Disconnected ${result.data.displayName}.`
            : `Reconnected ${result.data.displayName}.`
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setPendingAccountId(null);
    });
  }

  function handleChanged() {
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Social Accounts"
        description={`Channels connected to ${workspaceName}. Every workspace manages its own accounts.`}
        action={
          <PermissionButton permission="manageSocialAccounts" onClick={() => setConnectOpen(true)}>
            <Plus />
            Connect account
          </PermissionButton>
        }
      />

      <Card className="overflow-hidden py-0">
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {accounts.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No social accounts connected yet in {workspaceName}.
            </p>
          ) : (
            accounts.map((account) => {
              const rowPending = isPending && pendingAccountId === account.id;
              return (
                <div key={account.id} className="flex items-center justify-between gap-3 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => openAccount(account.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${platformColor[account.platform]}`}
                    >
                      {platformAbbr[account.platform]}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{account.platform}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {account.handle} · {account.followersLabel} followers
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <Badge variant={socialStatusVariant(account.status)}>
                      {SOCIAL_STATUS_LABEL[account.status]}
                    </Badge>
                    <PermissionButton
                      permission="manageSocialAccounts"
                      variant="outline"
                      size="sm"
                      disabled={rowPending}
                      onClick={() => handleToggle(account)}
                    >
                      {account.status === "Connected" ? "Disconnect" : "Reconnect"}
                    </PermissionButton>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
        {accounts.length > 0 && (
          <CardFooter className="border-t border-border py-4">
            <p className="text-xs text-muted-foreground">
              OAuth is simulated for now — real TikTok, Instagram, YouTube, and X
              integrations come later.
            </p>
          </CardFooter>
        )}
      </Card>

      <AccountDetailDialog
        account={selectedAccount}
        workspaceSlug={workspaceSlug}
        canManage={canManage}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedAccount(null);
        }}
        onChanged={handleChanged}
      />

      <ConnectAccountDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        isPending={isPending && pendingAccountId === null}
        onConnect={handleConnect}
      />
    </div>
  );
}
