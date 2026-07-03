"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { EventChipContent } from "@/components/calendar/event-chip";
import { EventDetailSheet } from "@/components/calendar/event-detail-sheet";
import { DayAgendaSheet } from "@/components/calendar/day-agenda-sheet";
import { PermissionButton } from "@/components/permissions/permission-button";
import {
  TODAY,
  addDays,
  addMonths,
  formatDayLabel,
  formatHourLabel,
  formatMonthLabel,
  formatWeekRangeLabel,
  startOfWeek,
  toISODate,
} from "@/lib/calendar";
import { calendarEvents as seedCalendarEvents } from "@/lib/mock-data";
import { usePermission } from "@/hooks/use-permission";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useWorkspace } from "@/context/workspace-context";

type CalendarViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const { activeWorkspace } = useWorkspace();
  const canPublish = usePermission("publishContent");
  const isMobile = useIsMobile();
  const [events, setEvents] = React.useState(seedCalendarEvents);
  const [view, setView] = React.useState<CalendarViewMode | null>(null);
  const [cursor, setCursor] = React.useState(() => new Date(TODAY));
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [agendaDate, setAgendaDate] = React.useState<Date | null>(null);

  // No explicit choice yet -> default to the view that actually works at
  // this width (Day is the only one that's legible on a phone).
  const effectiveView: CalendarViewMode = view ?? (isMobile ? "day" : "month");
  const canDrag = canPublish && !isMobile;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const workspaceEvents = events.filter(
    (event) => event.workspaceId === activeWorkspace.id
  );
  const activeEvent = workspaceEvents.find((e) => e.id === activeEventId) ?? null;
  const selectedEvent = workspaceEvents.find((e) => e.id === selectedEventId) ?? null;
  const agendaEvents = agendaDate
    ? workspaceEvents
        .filter((event) => event.date === toISODate(agendaDate))
        .sort((a, b) => a.time.localeCompare(b.time))
    : [];

  function goToday() {
    setCursor(new Date(TODAY));
  }

  function goPrev() {
    setCursor((prev) =>
      effectiveView === "month"
        ? addMonths(prev, -1)
        : addDays(prev, effectiveView === "week" ? -7 : -1)
    );
  }

  function goNext() {
    setCursor((prev) =>
      effectiveView === "month"
        ? addMonths(prev, 1)
        : addDays(prev, effectiveView === "week" ? 7 : 1)
    );
  }

  function rescheduleEvent(eventId: string, date: string, time: string) {
    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, date, time } : event))
    );
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveEventId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveEventId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);

    if (overId.startsWith("day:")) {
      const event = workspaceEvents.find((ev) => ev.id === active.id);
      if (event) rescheduleEvent(event.id, overId.slice("day:".length), event.time);
    } else if (overId.startsWith("hour:")) {
      const [, date, hour] = overId.split(":");
      rescheduleEvent(String(active.id), date, formatHourLabel(Number(hour)));
    }
  }

  const periodLabel =
    effectiveView === "month"
      ? formatMonthLabel(cursor)
      : effectiveView === "week"
        ? formatWeekRangeLabel(startOfWeek(cursor))
        : formatDayLabel(cursor);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={`Visualize ${activeWorkspace.name}'s content schedule across every channel.`}
        action={
          <PermissionButton permission="publishContent">
            <Plus />
            Schedule post
          </PermissionButton>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="min-w-40 text-sm font-semibold">{periodLabel}</h3>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-9 sm:size-8" onClick={goPrev}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-9 sm:size-8" onClick={goNext}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
            </div>
          </div>

          <Tabs
            value={effectiveView}
            onValueChange={(value) => setView(value as CalendarViewMode)}
          >
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DndContext
          id="calendar-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {effectiveView === "month" && (
            <MonthView
              cursor={cursor}
              events={workspaceEvents}
              draggable={canDrag}
              onSelectEvent={setSelectedEventId}
              onSelectDay={setAgendaDate}
            />
          )}
          {effectiveView === "week" && (
            <WeekView
              cursor={cursor}
              events={workspaceEvents}
              draggable={canDrag}
              onSelectEvent={setSelectedEventId}
            />
          )}
          {effectiveView === "day" && (
            <DayView
              cursor={cursor}
              events={workspaceEvents}
              draggable={canDrag}
              onSelectEvent={setSelectedEventId}
            />
          )}

          <DragOverlay>
            {activeEvent ? (
              <EventChipContent
                event={activeEvent}
                variant={effectiveView === "month" ? "block" : "detailed"}
                className="shadow-lg"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card>

      <EventDetailSheet
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
        onReschedule={rescheduleEvent}
        canReschedule={canPublish}
      />

      <DayAgendaSheet
        date={agendaDate}
        events={agendaEvents}
        open={agendaDate !== null}
        onOpenChange={(open) => {
          if (!open) setAgendaDate(null);
        }}
        onSelectEvent={(eventId) => {
          setAgendaDate(null);
          setSelectedEventId(eventId);
        }}
      />
    </div>
  );
}
