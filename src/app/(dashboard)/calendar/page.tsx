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
} from "@/lib/calendar";
import { calendarEvents as seedCalendarEvents } from "@/lib/mock-data";
import { usePermission } from "@/hooks/use-permission";
import { useWorkspace } from "@/context/workspace-context";

type CalendarViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const { activeWorkspace } = useWorkspace();
  const canPublish = usePermission("publishContent");
  const [events, setEvents] = React.useState(seedCalendarEvents);
  const [view, setView] = React.useState<CalendarViewMode>("month");
  const [cursor, setCursor] = React.useState(() => new Date(TODAY));
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const workspaceEvents = events.filter(
    (event) => event.workspaceId === activeWorkspace.id
  );
  const activeEvent = workspaceEvents.find((e) => e.id === activeEventId) ?? null;

  function goToday() {
    setCursor(new Date(TODAY));
  }

  function goPrev() {
    setCursor((prev) =>
      view === "month" ? addMonths(prev, -1) : addDays(prev, view === "week" ? -7 : -1)
    );
  }

  function goNext() {
    setCursor((prev) =>
      view === "month" ? addMonths(prev, 1) : addDays(prev, view === "week" ? 7 : 1)
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

    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== active.id) return event;
        if (overId.startsWith("day:")) {
          return { ...event, date: overId.slice("day:".length) };
        }
        if (overId.startsWith("hour:")) {
          const [, date, hour] = overId.split(":");
          return { ...event, date, time: formatHourLabel(Number(hour)) };
        }
        return event;
      })
    );
  }

  const periodLabel =
    view === "month"
      ? formatMonthLabel(cursor)
      : view === "week"
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
              <Button variant="outline" size="icon" className="size-8" onClick={goPrev}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={goNext}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
            </div>
          </div>

          <Tabs value={view} onValueChange={(value) => setView(value as CalendarViewMode)}>
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
          {view === "month" && (
            <MonthView cursor={cursor} events={workspaceEvents} draggable={canPublish} />
          )}
          {view === "week" && (
            <WeekView cursor={cursor} events={workspaceEvents} draggable={canPublish} />
          )}
          {view === "day" && (
            <DayView cursor={cursor} events={workspaceEvents} draggable={canPublish} />
          )}

          <DragOverlay>
            {activeEvent ? (
              <EventChipContent
                event={activeEvent}
                variant={view === "month" ? "block" : "detailed"}
                className="shadow-lg"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card>
    </div>
  );
}
