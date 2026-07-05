"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, RotateCcw, Trash2, X as XIcon } from "lucide-react";
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
  deleteAssetAction,
  moveAssetAction,
  renameAssetAction,
  restoreAssetAction,
  updateAssetTagsAction,
} from "@/lib/asset-actions";
import type { AssetDetail } from "@/lib/asset-data";
import { assetTypeIcon } from "@/lib/asset-icon";
import { formatBytes } from "@/lib/format";
import type { ContentStatus } from "@/lib/mock-data";
import { statusVariant } from "@/lib/status";

export function AssetDetailDialog({
  asset,
  workspaceSlug,
  canManage,
  open,
  onOpenChange,
  onChanged,
}: {
  asset: AssetDetail | null;
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
  const [editingFolder, setEditingFolder] = React.useState(false);
  const [folder, setFolder] = React.useState("");
  const [editingTags, setEditingTags] = React.useState(false);
  const [tagsInput, setTagsInput] = React.useState("");
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // Committed display values, separate from the edit-buffer state above —
  // updated from each action's own response so a rename/move/tag edit
  // shows immediately without waiting for a fresh getAssetDetailAction
  // round trip. router.refresh() (via onChanged) still runs to keep the
  // underlying asset grid in sync.
  const [display, setDisplay] = React.useState(asset);

  // Reset local edit + display state exactly once per "open session" for
  // a given asset: openKey is null while the dialog is closed, so
  // reopening the *same* asset (e.g. viewing it again from Trash right
  // after deleting it) resets confirmingDelete/editing state too, not
  // just a change of asset id. A render-time comparison instead of an
  // effect, matching the prevInitial* pattern used elsewhere in this app
  // (e.g. TeamBoard, CalendarBoard).
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  if (!open) {
    if (openKey !== null) setOpenKey(null);
  } else if (asset && asset.id !== openKey) {
    setOpenKey(asset.id);
    setDisplay(asset);
    setName(asset.name);
    setFolder(asset.folder);
    setTagsInput(asset.tags.join(", "));
    setEditingName(false);
    setEditingFolder(false);
    setEditingTags(false);
    setConfirmingDelete(false);
  }

  if (!asset || !display) return null;

  const Icon = assetTypeIcon[display.type];
  const isDeleted = display.status === "Deleted";

  function saveName() {
    if (!display) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === display.name) {
      setEditingName(false);
      return;
    }
    startTransition(async () => {
      const result = await renameAssetAction(workspaceSlug, display.id, trimmed);
      if (result.ok) {
        toast.success("Renamed.");
        setDisplay((prev) => (prev ? { ...prev, name: result.data.name } : prev));
        setEditingName(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function saveFolder() {
    if (!display) return;
    const trimmed = folder.trim() || "Uncategorized";
    if (trimmed === display.folder) {
      setEditingFolder(false);
      return;
    }
    startTransition(async () => {
      const result = await moveAssetAction(workspaceSlug, display.id, trimmed);
      if (result.ok) {
        toast.success(`Moved to ${result.data.folder}.`);
        setDisplay((prev) => (prev ? { ...prev, folder: result.data.folder } : prev));
        setEditingFolder(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function saveTags() {
    if (!display) return;
    const cleaned = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    startTransition(async () => {
      const result = await updateAssetTagsAction(workspaceSlug, display.id, cleaned);
      if (result.ok) {
        toast.success("Tags updated.");
        setDisplay((prev) => (prev ? { ...prev, tags: result.data.tags } : prev));
        setEditingTags(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!asset) return;
    startTransition(async () => {
      const result = await deleteAssetAction(workspaceSlug, asset.id);
      if (result.ok) {
        toast.success(`Deleted ${result.data.name}.`);
        onOpenChange(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRestore() {
    if (!asset) return;
    startTransition(async () => {
      const result = await restoreAssetAction(workspaceSlug, asset.id);
      if (result.ok) {
        toast.success(`Restored ${result.data.name}.`);
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
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
              className="flex items-center gap-2 pr-6"
            >
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
              <Button type="submit" size="icon" className="size-8 shrink-0" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setEditingName(false)}
                disabled={isPending}
              >
                <XIcon className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 pr-6">
              <DialogTitle className="min-w-0 truncate">{display.name}</DialogTitle>
              {canManage && !isDeleted && (
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
            {display.type} · {formatBytes(display.byteSize)} · Added {display.dateLabel}
            {isDeleted && " · Deleted"}
          </DialogDescription>
        </DialogHeader>

        {display.hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/assets/thumbnail/${display.id}`}
            alt={display.name}
            className="aspect-video w-full rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
            <Icon className="size-10 text-muted-foreground" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Folder</span>
          {editingFolder ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveFolder();
              }}
              className="flex items-center gap-2"
            >
              <Input autoFocus value={folder} onChange={(e) => setFolder(e.target.value)} disabled={isPending} />
              <Button type="submit" size="icon" className="size-8 shrink-0" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setEditingFolder(false)}
                disabled={isPending}
              >
                <XIcon className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="w-fit">
                {display.folder}
              </Badge>
              {canManage && !isDeleted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setEditingFolder(true)}
                  aria-label="Move to a different folder"
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Tags</span>
          {editingTags ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTags();
              }}
              className="flex items-center gap-2"
            >
              <Input
                autoFocus
                placeholder="Comma-separated"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={isPending}
              />
              <Button type="submit" size="icon" className="size-8 shrink-0" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setEditingTags(false)}
                disabled={isPending}
              >
                <XIcon className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {display.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
              {display.tags.length === 0 && <span className="text-sm text-muted-foreground">No tags</span>}
              {canManage && !isDeleted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setEditingTags(true)}
                  aria-label="Edit tags"
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {display.usedIn.length === 0
              ? "Used in no content yet"
              : `Used in ${display.usedIn.length} ${display.usedIn.length === 1 ? "post" : "posts"}`}
          </span>
          {display.usedIn.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {display.usedIn.map((item) => (
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
            {isDeleted ? (
              <Button type="button" variant="outline" onClick={handleRestore} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Restore
              </Button>
            ) : confirmingDelete ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Delete {display.name}? It moves to Trash and can be restored later.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    disabled={isPending}
                    onClick={handleDelete}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
