"use client";

import { EventChip } from "@/components/calendar/event-chip";
import { DroppableSlot } from "@/components/calendar/droppable-slot";
import { WEEKDAYS, TODAY, buildMonthGrid, isSameDay, toISODate } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";

export function MonthView({
  cursor,
  events,
}: {
  cursor: Date;
  events: CalendarEvent[];
}) {
  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
      {WEEKDAYS.map((day) => (
        <div
          key={day}
          className="bg-muted/40 px-2 py-2 text-center font-medium text-muted-foreground"
        >
          {day}
        </div>
      ))}
      {cells.map((day, idx) => {
        if (!day) {
          return <div key={idx} className="min-h-24 bg-card/50 sm:min-h-28" />;
        }
        const iso = toISODate(day);
        const dayEvents = events
          .filter((event) => event.date === iso)
          .sort((a, b) => a.time.localeCompare(b.time));

        return (
          <DroppableSlot
            key={idx}
            id={`day:${iso}`}
            className="flex min-h-24 flex-col gap-1 bg-card p-1.5 transition-colors sm:min-h-28"
          >
            <span
              className={
                "flex size-5 items-center justify-center rounded-full text-[11px] font-medium " +
                (isSameDay(day, TODAY)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground")
              }
            >
              {day.getDate()}
            </span>
            <div className="flex flex-col gap-1">
              {dayEvents.map((event) => (
                <EventChip key={event.id} event={event} />
              ))}
            </div>
          </DroppableSlot>
        );
      })}
    </div>
  );
}
