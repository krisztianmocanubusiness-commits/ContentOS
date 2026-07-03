"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";

export function DroppableSlot({
  id,
  className,
  onClick,
  children,
}: {
  id: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        className,
        isOver && "bg-accent/60 ring-1 ring-inset ring-primary/40"
      )}
    >
      {children}
    </div>
  );
}
