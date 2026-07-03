"use client";

import * as React from "react";

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

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "X", "LinkedIn", "YouTube"];

export function ConnectAccountDialog({
  open,
  onOpenChange,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (input: { platform: Platform; handle: string }) => void;
}) {
  const [platform, setPlatform] = React.useState<Platform>("Instagram");
  const [handle, setHandle] = React.useState("");

  function reset() {
    setPlatform("Instagram");
    setHandle("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = handle.trim();
    if (!trimmed) return;
    onConnect({ platform, handle: trimmed });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect account</DialogTitle>
          <DialogDescription>
            Connections are mocked for now — this adds a placeholder account,
            not a real OAuth link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-platform">Platform</Label>
            <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
              <SelectTrigger id="account-platform">
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
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Connect</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
