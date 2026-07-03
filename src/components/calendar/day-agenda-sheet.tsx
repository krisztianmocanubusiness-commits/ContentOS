"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EventChipContent } from "@/components/calendar/event-chip";
import { formatDayLabel } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";

export function DayAgendaSheet({
  date,
  events,
  open,
  onOpenChange,
  onSelectEvent,
}: {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEvent: (eventId: string) => void;
}) {
  if (!date) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{formatDayLabel(date)}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled this day.
            </p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="text-left"
              >
                <EventChipContent event={event} variant="detailed" />
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
