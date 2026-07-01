"use client";

import { EventChip } from "@/components/calendar/event-chip";
import { DroppableSlot } from "@/components/calendar/droppable-slot";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  formatHourLabel,
  parseTimeToHour,
  toISODate,
} from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";

export function DayView({
  cursor,
  events,
}: {
  cursor: Date;
  events: CalendarEvent[];
}) {
  const iso = toISODate(cursor);
  const dayEvents = events.filter((event) => event.date === iso);
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {hours.map((hour) => {
        const hourEvents = dayEvents.filter(
          (event) => parseTimeToHour(event.time) === hour
        );

        return (
          <DroppableSlot
            key={hour}
            id={`hour:${iso}:${hour}`}
            className="flex min-h-16 items-stretch gap-4 border-b border-border transition-colors last:border-b-0"
          >
            <div className="w-20 shrink-0 border-r border-border bg-muted/30 px-3 py-2 text-right text-xs font-medium text-muted-foreground">
              {formatHourLabel(hour)}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 py-2 pr-3">
              {hourEvents.map((event) => (
                <EventChip key={event.id} event={event} variant="detailed" />
              ))}
            </div>
          </DroppableSlot>
        );
      })}
    </div>
  );
}
