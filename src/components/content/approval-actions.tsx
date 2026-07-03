"use client";

import * as React from "react";
import { Check, RotateCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/use-permission";
import type { ContentItem } from "@/lib/mock-data";

export function ApprovalActions({
  item,
  onSubmitForReview,
  onApprove,
  onRequestChanges,
}: {
  item: ContentItem;
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
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 pb-4">
        <Button size="sm" variant="outline" onClick={onSubmitForReview}>
          <Send />
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
        />
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
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
            disabled={!reason.trim()}
            onClick={() => {
              onRequestChanges(reason.trim());
              setRequestingChanges(false);
              setReason("");
            }}
          >
            <RotateCcw />
            Send back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-4 pb-4">
      <Button size="sm" variant="outline" onClick={() => setRequestingChanges(true)}>
        <RotateCcw />
        Request changes
      </Button>
      <Button size="sm" onClick={onApprove}>
        <Check />
        Approve
      </Button>
    </div>
  );
}
