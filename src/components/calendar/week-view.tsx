"use client";

import { EventChip, EventChipContent } from "@/components/calendar/event-chip";
import { DroppableSlot } from "@/components/calendar/droppable-slot";
import { WEEKDAYS, TODAY, addDays, isSameDay, startOfWeek, toISODate } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/mock-data";

export function WeekView({
  cursor,
  events,
  draggable = true,
  onSelectEvent,
}: {
  cursor: Date;
  events: CalendarEvent[];
  draggable?: boolean;
  onSelectEvent?: (eventId: string) => void;
}) {
  const weekStart = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <>
      {/* Mobile: a 7-column grid is unreadable at this width — stack each day as its own agenda section instead. */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border md:hidden">
        {days.map((day, idx) => {
          const iso = toISODate(day);
          const today = isSameDay(day, TODAY);
          const dayEvents = events
            .filter((event) => event.date === iso)
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div key={idx} className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                    (today ? "bg-primary text-primary-foreground" : "text-foreground")
                  }
                >
                  {day.getDate()}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {WEEKDAYS[day.getDay()]}
                </span>
              </div>
              {dayEvents.length === 0 ? (
                <p className="pl-8 text-xs text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <div className="flex flex-col gap-1.5 pl-8">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent?.(event.id)}
                      className="text-left"
                    >
                      <EventChipContent event={event} variant="detailed" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: the original 7-column grid, draggable. */}
      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs md:grid">
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
                  <EventChip
                    key={event.id}
                    event={event}
                    variant="detailed"
                    draggable={draggable}
                    onSelect={() => onSelectEvent?.(event.id)}
                  />
                ))}
              </div>
            </DroppableSlot>
          );
        })}
      </div>
    </>
  );
}
