"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Platform } from "@/lib/mock-data";

const PLATFORMS: Platform[] = [
  "TikTok",
  "Instagram",
  "YouTube",
  "X",
  "Facebook",
  "Threads",
  "LinkedIn",
  "Pinterest",
];

export function ConnectAccountDialog({
  open,
  onOpenChange,
  isPending,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConnect: (input: { platform: Platform; handle: string; displayName: string }) => void;
}) {
  const [platform, setPlatform] = React.useState<Platform>("Instagram");
  const [handle, setHandle] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");

  function reset() {
    setPlatform("Instagram");
    setHandle("");
    setDisplayName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = handle.trim();
    if (!trimmed) return;
    onConnect({ platform, handle: trimmed, displayName: displayName.trim() || trimmed });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect account</DialogTitle>
          <DialogDescription>
            OAuth is simulated for now — this creates a placeholder connection with
            fake scopes and a token expiry, not a real link to {platform}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-platform">Platform</Label>
            <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
              <SelectTrigger id="account-platform" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-handle">Handle</Label>
            <Input
              id="account-handle"
              placeholder="e.g. @keris"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoFocus
              required
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-display-name">Display name</Label>
            <Input
              id="account-display-name"
              placeholder="Defaults to the handle"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
