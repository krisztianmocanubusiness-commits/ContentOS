"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Pencil, Plug, PlugZap, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  disconnectAccountAction,
  reconnectAccountAction,
  renameAccountAction,
  simulateConnectionIssueAction,
} from "@/lib/social-account-actions";
import type { SocialAccountDetail } from "@/lib/social-account-data";
import { platformAbbr, platformColor } from "@/lib/platform";
import { CONNECTION_HEALTH_LABEL, SOCIAL_STATUS_LABEL } from "@/lib/social-account-types";
import { statusVariant, socialStatusVariant } from "@/lib/status";
import type { ContentStatus } from "@/lib/mock-data";

export function AccountDetailDialog({
  account,
  workspaceSlug,
  canManage,
  open,
  onOpenChange,
  onChanged,
}: {
  account: SocialAccountDetail | null;
  workspaceSlug: string;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [editingName, setEditingName] = React.useState(false);
  const [name, setName] = React.useState("");
  const [display, setDisplay] = React.useState(account);

  const [openKey, setOpenKey] = React.useState<string | null>(null);
  if (!open) {
    if (openKey !== null) setOpenKey(null);
  } else if (account && account.id !== openKey) {
    setOpenKey(account.id);
    setDisplay(account);
    setName(account.displayName);
    setEditingName(false);
  }

  if (!account || !display) return null;

  function saveName() {
    if (!display) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === display.displayName) {
      setEditingName(false);
      return;
    }
    startTransition(async () => {
      const result = await renameAccountAction(workspaceSlug, display.id, trimmed);
      if (result.ok) {
        toast.success("Renamed.");
        setDisplay((prev) => (prev ? { ...prev, displayName: result.data.displayName } : prev));
        setEditingName(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDisconnect() {
    if (!display) return;
    startTransition(async () => {
      const result = await disconnectAccountAction(workspaceSlug, display.id);
      if (result.ok) {
        toast.success(`Disconnected ${display.displayName}.`);
        onOpenChange(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleReconnect() {
    if (!display) return;
    startTransition(async () => {
      const result = await reconnectAccountAction(workspaceSlug, display.id);
      if (result.ok) {
        toast.success(`Reconnected ${display.displayName}.`);
        onOpenChange(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSimulateIssue() {
    if (!display) return;
    startTransition(async () => {
      const result = await simulateConnectionIssueAction(workspaceSlug, display.id);
      if (result.ok) {
        toast.success(`${display.displayName} now needs reauthorization.`);
        onOpenChange(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${platformColor[display.platform]}`}
            >
              {platformAbbr[display.platform]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveName();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
                  <Button type="submit" size="icon" className="size-8 shrink-0" disabled={isPending} aria-label="Save name">
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setEditingName(false)}
                    disabled={isPending}
                    aria-label="Cancel rename"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <DialogTitle className="min-w-0 truncate">{display.displayName}</DialogTitle>
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => setEditingName(true)}
                      aria-label="Rename"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
              )}
              <DialogDescription>
                {display.platform} · {display.handle} · {display.followersLabel} followers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Badge variant={socialStatusVariant(display.status)} className="w-fit">
              {SOCIAL_STATUS_LABEL[display.status]}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Connected since</span>
            <span className="text-sm">{display.connectedSinceLabel ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Last synced</span>
            <span className="text-sm">{display.lastSyncedLabel ?? "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Connection health</span>
            <span className="flex items-center gap-1.5 text-sm">
              {display.health === "Expired" && <AlertTriangle className="size-3.5 text-warning" />}
              {CONNECTION_HEALTH_LABEL[display.health]}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Token expires</span>
            <span className="text-sm">{display.tokenExpiresAtLabel ?? "—"}</span>
          </div>
        </div>

        {display.scopes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Permissions</span>
            <div className="flex flex-wrap gap-1.5">
              {display.scopes.map((scope) => (
                <Badge key={scope} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {display.recentPosts.length === 0
              ? "No posts on this platform yet"
              : `Recent posts (${display.recentPosts.length})`}
          </span>
          {display.recentPosts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {display.recentPosts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <Badge variant={statusVariant(item.status as ContentStatus)}>{item.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {canManage && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {display.status === "Connected" ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={handleDisconnect}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
                    Disconnect
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleSimulateIssue}
                    disabled={isPending}
                    title="Demo affordance: simulates the platform revoking access"
                  >
                    <AlertTriangle className="size-4" />
                    Simulate issue
                  </Button>
                </div>
              ) : (
                <Button type="button" onClick={handleReconnect} disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                  Reconnect
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
