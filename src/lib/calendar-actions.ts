"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { AuditAction, Platform as DbPlatform } from "@/generated/prisma/enums";
import { combineDateAndTime, formatTimeLabel, toISODate } from "@/lib/calendar";
import type { ActionResult } from "@/lib/action-result";
import type { CalendarEvent } from "@/lib/mock-data";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const MAX_TITLE_LENGTH = 200;
const VALID_PLATFORMS = new Set(Object.values(DbPlatform));

type EventInput = {
  title: string;
  platform: string;
  date: string;
  time: string;
};

function toEventDTO(row: {
  id: string;
  workspaceId: string;
  scheduledAt: Date;
  title: string;
  platform: string;
}): CalendarEvent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    date: toISODate(row.scheduledAt),
    time: formatTimeLabel(row.scheduledAt),
    title: row.title,
    platform: row.platform as CalendarEvent["platform"],
  };
}

function validateEventInput(input: EventInput): { error: string } | { title: string; platform: DbPlatform; scheduledAt: Date } {
  const title = input.title.trim();
  if (!title) return { error: "Give the post a title." };
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }
  if (!VALID_PLATFORMS.has(input.platform as DbPlatform)) {
    return { error: "Choose a valid platform." };
  }
  const scheduledAt = combineDateAndTime(input.date, input.time);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "Choose a valid date and time." };
  }
  return { title, platform: input.platform as DbPlatform, scheduledAt };
}

export async function createEventAction(
  workspaceSlug: string,
  input: EventInput
): Promise<ActionResult<CalendarEvent>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "publishContent")) {
    return { ok: false, error: "Your role can't schedule posts.", code: "forbidden" };
  }

  const validated = validateEventInput(input);
  if ("error" in validated) {
    return { ok: false, error: validated.error, code: "invalid" };
  }

  const eventId = randomUUID();
  const [event] = await prisma.$transaction([
    prisma.calendarEvent.create({
      data: {
        id: eventId,
        workspaceId: workspace.id,
        title: validated.title,
        platform: validated.platform,
        scheduledAt: validated.scheduledAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        calendarEventId: eventId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.CalendarEventCreated,
        metadata: { title: validated.title },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/calendar`);

  return { ok: true, data: toEventDTO(event) };
}

export async function updateEventAction(
  workspaceSlug: string,
  eventId: string,
  input: EventInput
): Promise<ActionResult<CalendarEvent>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "publishContent")) {
    return { ok: false, error: "Your role can't edit scheduled posts.", code: "forbidden" };
  }

  const validated = validateEventInput(input);
  if ("error" in validated) {
    return { ok: false, error: validated.error, code: "invalid" };
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Post not found.", code: "not_found" };
  }

  const [event] = await prisma.$transaction([
    prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: validated.title,
        platform: validated.platform,
        scheduledAt: validated.scheduledAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        calendarEventId: eventId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.CalendarEventUpdated,
        metadata: { title: validated.title },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/calendar`);

  return { ok: true, data: toEventDTO(event) };
}

export async function rescheduleEventAction(
  workspaceSlug: string,
  eventId: string,
  input: { date: string; time: string }
): Promise<ActionResult<CalendarEvent>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "publishContent")) {
    return { ok: false, error: "Your role can't reschedule posts.", code: "forbidden" };
  }

  const scheduledAt = combineDateAndTime(input.date, input.time);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "Choose a valid date and time.", code: "invalid" };
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Post not found.", code: "not_found" };
  }

  const [event] = await prisma.$transaction([
    prisma.calendarEvent.update({
      where: { id: eventId },
      data: { scheduledAt },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        calendarEventId: eventId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.CalendarEventRescheduled,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/calendar`);

  return { ok: true, data: toEventDTO(event) };
}

export async function deleteEventAction(
  workspaceSlug: string,
  eventId: string
): Promise<ActionResult<{ id: string }>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);

  if (!hasPermission(role, "publishContent")) {
    return { ok: false, error: "Your role can't delete scheduled posts.", code: "forbidden" };
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, workspaceId: workspace.id },
    select: { id: true, title: true },
  });
  if (!existing) {
    return { ok: false, error: "Post not found.", code: "not_found" };
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        // Written before the delete so the FK is still valid; onDelete:
        // SetNull then clears it, but metadata keeps the title readable.
        calendarEventId: eventId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.CalendarEventDeleted,
        metadata: { title: existing.title },
      },
    }),
    prisma.calendarEvent.delete({ where: { id: eventId } }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/calendar`);

  return { ok: true, data: { id: eventId } };
}
