"use client";

import * as React from "react";
import { Loader2, Save, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDayLabel,
  fromISODate,
  inputValueToTimeLabel,
  timeLabelToInputValue,
} from "@/lib/calendar";
import { platformColor } from "@/lib/platform";
import type { CalendarEvent, Platform } from "@/lib/mock-data";

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "X", "LinkedIn", "YouTube"];

export function EventDetailSheet({
  event,
  open,
  pending = false,
  canManage,
  onOpenChange,
  onSave,
  onDelete,
}: {
  event: CalendarEvent | null;
  open: boolean;
  pending?: boolean;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (eventId: string, input: { title: string; platform: Platform; date: string; time: string }) => void;
  onDelete: (eventId: string) => void;
}) {
  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${platformColor[event.platform]}`} />
            <span className="text-xs text-muted-foreground">{event.platform}</span>
          </div>
          <SheetTitle>{event.title}</SheetTitle>
          <SheetDescription>
            {formatDayLabel(fromISODate(event.date))} · {event.time}
          </SheetDescription>
        </SheetHeader>

        {canManage ? (
          <EventEditForm
            key={event.id}
            event={event}
            pending={pending}
            onSave={(input) => onSave(event.id, input)}
            onDelete={() => onDelete(event.id)}
          />
        ) : (
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            Your role can&apos;t manage scheduled posts.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EventEditForm({
  event,
  pending,
  onSave,
  onDelete,
}: {
  event: CalendarEvent;
  pending: boolean;
  onSave: (input: { title: string; platform: Platform; date: string; time: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = React.useState(event.title);
  const [platform, setPlatform] = React.useState<Platform>(event.platform);
  const [date, setDate] = React.useState(event.date);
  const [time, setTime] = React.useState(timeLabelToInputValue(event.time));
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !date || !time) return;
    onSave({ title: trimmed, platform, date, time: inputValueToTimeLabel(time) });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            disabled={pending}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-platform">Platform</Label>
            <Select
              value={platform}
              onValueChange={(value) => setPlatform(value as Platform)}
              disabled={pending}
            >
              <SelectTrigger id="edit-platform">
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
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-time">Time</Label>
          <Input
            id="edit-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            disabled={pending}
          />
        </div>

        <Button type="submit" disabled={!title.trim() || pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save changes
        </Button>
      </form>

      <Separator />

      <div className="p-4">
        {confirmingDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Delete this post? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={pending}
                onClick={onDelete}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 />
            Delete post
          </Button>
        )}
      </div>
    </>
  );
}
