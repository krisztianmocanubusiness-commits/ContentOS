"use client";

import * as React from "react";
import { Clock } from "lucide-react";

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
  formatDayLabel,
  fromISODate,
  inputValueToTimeLabel,
  timeLabelToInputValue,
} from "@/lib/calendar";
import { platformColor } from "@/lib/platform";
import type { CalendarEvent } from "@/lib/mock-data";

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onReschedule,
  canReschedule,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (eventId: string, date: string, time: string) => void;
  canReschedule: boolean;
}) {
  const dateRef = React.useRef<HTMLInputElement>(null);
  const timeRef = React.useRef<HTMLInputElement>(null);

  if (!event) return null;

  function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    const date = dateRef.current?.value;
    const time = timeRef.current?.value;
    if (!date || !time) return;
    onReschedule(event.id, date, inputValueToTimeLabel(time));
    onOpenChange(false);
  }

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

        {canReschedule ? (
          <form
            onSubmit={handleReschedule}
            key={event.id}
            className="flex flex-col gap-4 px-4 pb-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reschedule-date">Date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  ref={dateRef}
                  defaultValue={event.date}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reschedule-time">Time</Label>
                <Input
                  id="reschedule-time"
                  type="time"
                  ref={timeRef}
                  defaultValue={timeLabelToInputValue(event.time)}
                  required
                />
              </div>
            </div>
            <Button type="submit">
              <Clock />
              Reschedule
            </Button>
          </form>
        ) : (
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            Your role can&apos;t reschedule posts.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
