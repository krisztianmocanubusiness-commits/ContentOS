"use client";

import { EventChip } from "@/components/calendar/event-chip";
import { DroppableSlot } from "@/components/calendar/droppable-slot";
import { WEEKDAYS, TODAY, addDays, isSameDay, startOfWeek, toISODate } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";

export function WeekView({
  cursor,
  events,
}: {
  cursor: Date;
  events: CalendarEvent[];
}) {
  const weekStart = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
      {days.map((day, idx) => {
        const iso = toISODate(day);
        const today = isSameDay(day, TODAY);
        const dayEvents = events
          .filter((event) => event.date === iso)
          .sort((a, b) => a.time.localeCompare(b.time));

        return (
          <DroppableSlot
            key={idx}
            id={`day:${iso}`}
            className="flex min-h-72 flex-col gap-2 bg-card p-2 transition-colors"
          >
            <div className="flex flex-col items-center gap-0.5 pb-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {WEEKDAYS[day.getDay()]}
              </span>
              <span
                className={
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold " +
                  (today ? "bg-primary text-primary-foreground" : "text-foreground")
                }
              >
                {day.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {dayEvents.map((event) => (
                <EventChip key={event.id} event={event} variant="detailed" />
              ))}
            </div>
          </DroppableSlot>
        );
      })}
    </div>
  );
}
