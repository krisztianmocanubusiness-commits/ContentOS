"use client";

import { EventChip } from "@/components/calendar/event-chip";
import { DroppableSlot } from "@/components/calendar/droppable-slot";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { platformColor } from "@/lib/platform";
import { WEEKDAYS, TODAY, buildMonthGrid, isSameDay, toISODate } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";

export function MonthView({
  cursor,
  events,
  draggable = true,
  onSelectEvent,
  onSelectDay,
}: {
  cursor: Date;
  events: CalendarEvent[];
  draggable?: boolean;
  onSelectEvent?: (eventId: string) => void;
  onSelectDay?: (date: Date) => void;
}) {
  const isMobile = useIsMobile();
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
          return <div key={idx} className="min-h-14 bg-card/50 sm:min-h-24 md:min-h-28" />;
        }
        const iso = toISODate(day);
        const dayEvents = events
          .filter((event) => event.date === iso)
          .sort((a, b) => a.time.localeCompare(b.time));

        return (
          <DroppableSlot
            key={idx}
            id={`day:${iso}`}
            onClick={isMobile ? () => onSelectDay?.(day) : undefined}
            className="flex min-h-14 flex-col gap-1 bg-card p-1 transition-colors sm:min-h-24 sm:p-1.5 md:min-h-28"
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

            {/* Mobile: a dot per event — legible at this size, tap the day for the full list */}
            <div className="flex flex-wrap gap-0.5 sm:hidden">
              {dayEvents.map((event) => (
                <span
                  key={event.id}
                  className={`size-1.5 rounded-full ${platformColor[event.platform]}`}
                />
              ))}
            </div>

            {/* Desktop: full chips, individually tappable and (if allowed) draggable */}
            <div className="hidden flex-col gap-1 sm:flex">
              {dayEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  draggable={draggable}
                  onSelect={() => onSelectEvent?.(event.id)}
                />
              ))}
            </div>
          </DroppableSlot>
        );
      })}
    </div>
  );
}
