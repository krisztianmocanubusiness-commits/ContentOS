"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { contentForWorkspace, type SocialAccount } from "@/lib/mock-data";
import { platformAbbr, platformColor } from "@/lib/platform";
import { statusVariant } from "@/lib/status";

export function AccountDetailDialog({
  account,
  open,
  onOpenChange,
}: {
  account: SocialAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!account) return null;

  const recentPosts = contentForWorkspace(account.workspaceId)
    .filter((item) => item.platform === account.platform)
    .filter((item) => item.status === "Published" || item.status === "Scheduled")
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${platformColor[account.platform]}`}
            >
              {platformAbbr[account.platform]}
            </span>
            <div className="flex flex-col">
              <DialogTitle>{account.platform}</DialogTitle>
              <DialogDescription>
                {account.handle} · {account.followers} followers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Badge
              variant={account.status === "Connected" ? "success" : "outline"}
              className="w-fit"
            >
              {account.status}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Connected since
            </span>
            <span className="text-sm">{account.connectedSince}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Last synced
            </span>
            <span className="text-sm">{account.lastSynced}</span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {recentPosts.length === 0
              ? "No posts on this platform yet"
              : `Recent posts (${recentPosts.length})`}
          </span>
          {recentPosts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {recentPosts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
