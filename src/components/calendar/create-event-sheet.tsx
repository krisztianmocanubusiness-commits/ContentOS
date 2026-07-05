"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inputValueToTimeLabel, toISODate } from "@/lib/calendar";
import type { Platform } from "@/lib/mock-data";

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "X", "LinkedIn", "YouTube"];

export function CreateEventSheet({
  open,
  onOpenChange,
  defaultDate,
  pending,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  pending: boolean;
  onCreate: (input: { title: string; platform: Platform; date: string; time: string }) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Schedule post</SheetTitle>
          <SheetDescription>Add a new post to the calendar.</SheetDescription>
        </SheetHeader>

        {/* Mounted fresh each time the sheet opens, so its form state
            (title/platform/date/time) always starts blank without an
            effect-based reset. */}
        {open && (
          <CreateEventForm defaultDate={defaultDate} pending={pending} onCreate={onCreate} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreateEventForm({
  defaultDate,
  pending,
  onCreate,
}: {
  defaultDate?: Date;
  pending: boolean;
  onCreate: (input: { title: string; platform: Platform; date: string; time: string }) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform>("Instagram");
  const [date, setDate] = React.useState(toISODate(defaultDate ?? new Date()));
  const [time, setTime] = React.useState("09:00");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate({ title: trimmed, platform, date, time: inputValueToTimeLabel(time) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-title">Title</Label>
        <Input
          id="create-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Summer lookbook"
          autoFocus
          required
          maxLength={200}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-platform">Platform</Label>
          <Select
            value={platform}
            onValueChange={(value) => setPlatform(value as Platform)}
            disabled={pending}
          >
            <SelectTrigger id="create-platform">
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
          <Label htmlFor="create-date">Date</Label>
          <Input
            id="create-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-time">Time</Label>
        <Input
          id="create-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={!title.trim() || pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Schedule post
      </Button>
    </form>
  );
}
