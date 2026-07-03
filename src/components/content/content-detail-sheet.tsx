"use client";

import * as React from "react";
import { Check, RotateCcw, Send } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ApprovalActions } from "@/components/content/approval-actions";
import { assetById, type ContentItem, type ReviewAction } from "@/lib/mock-data";
import { assetTypeIcon } from "@/lib/asset-icon";
import { statusVariant } from "@/lib/status";

const REVIEW_ACTION_LABEL: Record<ReviewAction, string> = {
  submitted: "submitted for review",
  approved: "approved",
  changes_requested: "requested changes",
};

const REVIEW_ACTION_ICON: Record<ReviewAction, React.ElementType> = {
  submitted: Send,
  approved: Check,
  changes_requested: RotateCcw,
};

export function ContentDetailSheet({
  item,
  open,
  onOpenChange,
  onAddComment,
  onSubmitForReview,
  onApprove,
  onRequestChanges,
}: {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddComment: (itemId: string, body: string) => void;
  onSubmitForReview: (itemId: string) => void;
  onApprove: (itemId: string) => void;
  onRequestChanges: (itemId: string, reason: string) => void;
}) {
  const [draft, setDraft] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddComment(item.id, trimmed);
    setDraft("");
  }

  if (!item) return null;

  const linkedAssets = item.assetIds
    .map((id) => assetById(id))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setDraft("");
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
            <span className="text-xs text-muted-foreground">
              {item.platform} · {item.date}
            </span>
          </div>
          <SheetTitle className="text-lg">{item.title}</SheetTitle>
          <SheetDescription>
            By {item.author}
          </SheetDescription>
        </SheetHeader>

        <ApprovalActions
          item={item}
          onSubmitForReview={() => onSubmitForReview(item.id)}
          onApprove={() => onApprove(item.id)}
          onRequestChanges={(reason) => onRequestChanges(item.id, reason)}
        />

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-4">
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {item.body}
          </p>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {linkedAssets.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Linked assets
              </h4>
              <div className="flex flex-col gap-1.5">
                {linkedAssets.map((asset) => {
                  const Icon = assetTypeIcon[asset.type];
                  return (
                    <div
                      key={asset.id}
                      className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{asset.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {asset.size}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {item.reviewHistory.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Review history
              </h4>
              <div className="flex flex-col gap-2">
                {item.reviewHistory.map((event) => {
                  const Icon = REVIEW_ACTION_ICON[event.action];
                  return (
                    <div key={event.id} className="flex items-start gap-2.5 text-sm">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span>
                          <span className="font-medium">{event.by}</span>{" "}
                          <span className="text-muted-foreground">
                            {REVIEW_ACTION_LABEL[event.action]}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            · {event.timestamp}
                          </span>
                        </span>
                        {event.note && (
                          <p className="text-xs text-muted-foreground italic">
                            &ldquo;{event.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-muted-foreground">
              Comments {item.comments.length > 0 && `(${item.comments.length})`}
            </h4>
            {item.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {item.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                        {comment.authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {comment.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border p-4"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!draft.trim()}>
            <Send />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
