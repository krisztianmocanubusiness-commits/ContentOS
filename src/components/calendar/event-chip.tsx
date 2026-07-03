"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { platformColor } from "@/lib/platform";
import type { CalendarEvent } from "@/lib/mock-data";

type Variant = "block" | "detailed";

export function EventChipContent({
  event,
  variant = "block",
  className,
}: {
  event: CalendarEvent;
  variant?: Variant;
  className?: string;
}) {
  const title = `${event.title} · ${event.time}`;

  if (variant === "detailed") {
    return (
      <div
        title={title}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-2 text-xs font-medium select-none",
          className
        )}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            platformColor[event.platform] ?? "bg-muted-foreground"
          )}
        />
        <span className="min-w-0 flex-1 truncate">{event.title}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {event.time}
        </span>
      </div>
    );
  }

  return (
    <div
      title={title}
      className={cn(
        "flex items-center gap-1.5 truncate rounded-sm bg-muted px-1.5 py-1 text-[11px] font-medium select-none",
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          platformColor[event.platform] ?? "bg-muted-foreground"
        )}
      />
      <span className="truncate">{event.title}</span>
    </div>
  );
}

export function EventChip({
  event,
  variant = "block",
  draggable = true,
  onSelect,
}: {
  event: CalendarEvent;
  variant?: Variant;
  draggable?: boolean;
  onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id, data: { event }, disabled: !draggable });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  // Not draggable: a real <button> so tap-to-view is keyboard accessible too —
  // dnd-kit's own attributes (which include aria-disabled when disabled) only
  // make sense to spread when this is actually a drag handle.
  if (!draggable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className={cn("select-none text-left", onSelect && "cursor-pointer")}
      >
        <EventChipContent event={event} variant={variant} />
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={cn(
        "touch-none cursor-grab select-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <EventChipContent event={event} variant={variant} />
    </div>
  );
}
