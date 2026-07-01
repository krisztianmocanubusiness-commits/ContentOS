import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calendarEvents } from "@/lib/mock-data";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const platformDot: Record<string, string> = {
  Instagram: "bg-pink-500",
  TikTok: "bg-foreground",
  X: "bg-sky-500",
  LinkedIn: "bg-blue-600",
  YouTube: "bg-red-500",
};

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const year = 2026;
  const month = 6; // July
  const cells = buildMonthGrid(year, month);
  const today = 1;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Visualize your content schedule across every channel."
        action={
          <Button>
            <Plus />
            Schedule post
          </Button>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">July 2026</h3>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

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
            const events = calendarEvents.filter((e) => e.day === day);
            return (
              <div
                key={idx}
                className="flex min-h-24 flex-col gap-1 bg-card p-1.5 sm:min-h-28"
              >
                {day && (
                  <>
                    <span
                      className={
                        "flex size-5 items-center justify-center rounded-full text-[11px] font-medium " +
                        (day === today
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground")
                      }
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-1">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-1.5 truncate rounded-sm bg-muted px-1.5 py-1 text-[11px] font-medium"
                          title={`${event.title} · ${event.time}`}
                        >
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              platformDot[event.platform] ?? "bg-muted-foreground"
                            }`}
                          />
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
