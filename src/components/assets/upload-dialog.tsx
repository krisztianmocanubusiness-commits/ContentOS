"use client";

import * as React from "react";
import { AlertCircle, Check, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { MAX_UPLOAD_BYTES } from "@/lib/asset-types";
import { cn } from "@/lib/utils";

type UploadItem = {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

function uploadFile(
  workspaceSlug: string,
  file: File,
  folder: string,
  tags: string,
  onProgress: (pct: number) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("tags", tags);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/assets/${workspaceSlug}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
        return;
      }
      let message = "Upload failed.";
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (typeof parsed?.error === "string") message = parsed.error;
      } catch {
        // non-JSON error body — keep the generic message
      }
      resolve({ ok: false, error: message });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Network error." });
    xhr.send(formData);
  });
}

export function UploadDialog({
  open,
  onOpenChange,
  workspaceSlug,
  defaultFolder,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  defaultFolder: string;
  onUploaded: () => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [folder, setFolder] = React.useState(defaultFolder);
  const [tags, setTags] = React.useState("");
  const [items, setItems] = React.useState<UploadItem[] | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const uploading = items !== null && items.some((item) => item.status === "uploading");

  // Reset the form each time the dialog opens — a render-time comparison
  // instead of an effect, matching the prevInitial* pattern used elsewhere
  // in this app (e.g. TeamBoard, CalendarBoard).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFolder(defaultFolder);
      setFiles([]);
      setTags("");
      setItems(null);
    }
  }

  function addFiles(list: FileList | File[]) {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0 || uploading) return;
    const initial: UploadItem[] = files.map((file) => ({ file, progress: 0, status: "uploading" }));
    setItems(initial);

    const outcomes: boolean[] = [];
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(workspaceSlug, files[i], folder.trim() || "Uncategorized", tags, (pct) => {
        setItems((prev) => prev?.map((item, idx) => (idx === i ? { ...item, progress: pct } : item)) ?? prev);
      });
      outcomes.push(result.ok);
      setItems((prev) =>
        prev?.map((item, idx) =>
          idx === i
            ? result.ok
              ? { ...item, progress: 100, status: "done" as const }
              : { ...item, status: "error" as const, error: result.error }
            : item
        ) ?? prev
      );
    }

    if (outcomes.some(Boolean)) onUploaded();
    if (outcomes.every(Boolean)) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !uploading && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload assets</DialogTitle>
          <DialogDescription>
            Files are stored in this workspace&apos;s object storage — up to{" "}
            {Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB each.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!items && (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-border"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
              }}
            >
              <Upload className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => inputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {!items && files.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {items && (
            <div className="flex flex-col gap-2.5">
              {items.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                    {item.status === "done" && <Check className="size-4 shrink-0 text-success" />}
                    {item.status === "error" && <AlertCircle className="size-4 shrink-0 text-destructive" />}
                    {item.status === "uploading" && (
                      <span className="shrink-0 text-xs text-muted-foreground">{item.progress}%</span>
                    )}
                  </div>
                  {item.status === "error" ? (
                    <p className="text-xs text-destructive">{item.error}</p>
                  ) : (
                    <Progress value={item.progress} />
                  )}
                </div>
              ))}
            </div>
          )}

          {!items && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-folder">Folder</Label>
                <Input
                  id="upload-folder"
                  placeholder="e.g. Brand Assets"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-tags">Tags</Label>
                <Input
                  id="upload-tags"
                  placeholder="Comma-separated"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            {items ? "Close" : "Cancel"}
          </Button>
          {!items && (
            <Button type="button" onClick={handleUpload} disabled={files.length === 0}>
              <Upload />
              Upload {files.length > 0 ? files.length : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
