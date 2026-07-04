"use client";

import * as React from "react";
import { Check, Loader2, RotateCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/use-permission";
import type { ContentItem } from "@/lib/mock-data";

export function ApprovalActions({
  item,
  pending = false,
  onSubmitForReview,
  onApprove,
  onRequestChanges,
}: {
  item: ContentItem;
  pending?: boolean;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onRequestChanges: (reason: string) => void;
}) {
  const canCreate = usePermission("createContent");
  const canApprove = usePermission("approveContent");
  const [requestingChanges, setRequestingChanges] = React.useState(false);
  const [reason, setReason] = React.useState("");

  if (item.status === "Draft") {
    if (!canCreate) return null;
    return (
      <div className="flex items-center gap-2 border-b border-border px-4 pb-4">
        <Button
          size="sm"
          variant="outline"
          className="h-11 w-full sm:h-8 sm:w-auto"
          disabled={pending}
          onClick={onSubmitForReview}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          Submit for review
        </Button>
      </div>
    );
  }

  if (item.status !== "Needs Review") return null;

  if (!canApprove) {
    return (
      <p className="border-b border-border px-4 pb-4 text-xs text-muted-foreground">
        Waiting on a reviewer to approve or request changes.
      </p>
    );
  }

  if (requestingChanges) {
    return (
      <div className="flex w-full flex-col gap-2 border-b border-border px-4 pb-4">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What needs to change?"
          autoFocus
          disabled={pending}
        />
        <div className="flex gap-2 sm:justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-11 flex-1 sm:h-8 sm:flex-none"
            disabled={pending}
            onClick={() => {
              setRequestingChanges(false);
              setReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-11 flex-1 sm:h-8 sm:flex-none"
            disabled={!reason.trim() || pending}
            onClick={() => {
              onRequestChanges(reason.trim());
              setRequestingChanges(false);
              setReason("");
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Send back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 border-b border-border px-4 pb-4">
      <Button
        size="sm"
        variant="outline"
        className="h-11 flex-1 sm:h-8 sm:flex-none"
        disabled={pending}
        onClick={() => setRequestingChanges(true)}
      >
        <RotateCcw />
        Request changes
      </Button>
      <Button
        size="sm"
        className="h-11 flex-1 sm:h-8 sm:flex-none"
        disabled={pending}
        onClick={onApprove}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
        Approve
      </Button>
    </div>
  );
}
