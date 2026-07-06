"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  AuditAction,
  MonetizationCategory as DbMonetizationCategory,
  MonetizationProvider as DbMonetizationProvider,
  MonetizationStatus as DbMonetizationStatus,
  MonetizationType as DbMonetizationType,
  Platform as DbPlatform,
} from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import {
  getMonetizationEntries,
  getMonetizationOverview,
  type MonetizationEntryRow,
  type MonetizationFilters,
} from "@/lib/monetization-data";
import {
  CATEGORY_TYPE,
  SUPPORTED_CURRENCIES,
  type MonetizationCategory,
  type MonetizationProvider,
  type MonetizationStatus,
} from "@/lib/monetization-types";
import type { Platform } from "@/lib/mock-data";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const MAX_TITLE_LENGTH = 200;
const MAX_COUNTERPARTY_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_AMOUNT = 1_000_000_000;

export type MonetizationEntryInput = {
  category: MonetizationCategory;
  provider?: MonetizationProvider;
  platform?: Platform | null;
  title: string;
  counterpartyName?: string | null;
  description?: string | null;
  amount: number;
  currency?: string;
  date?: string;
  dueDate?: string | null;
  status?: MonetizationStatus;
};

function forbidden(): ActionResult<never> {
  return { ok: false, error: "Your role can't manage monetization.", code: "forbidden" };
}

function validateCommonFields(input: Partial<MonetizationEntryInput>): string | null {
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed) return "Give this entry a title.";
    if (trimmed.length > MAX_TITLE_LENGTH) return `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }
  if (input.counterpartyName && input.counterpartyName.length > MAX_COUNTERPARTY_LENGTH) {
    return `Counterparty name must be ${MAX_COUNTERPARTY_LENGTH} characters or fewer.`;
  }
  if (input.description && input.description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }
  if (input.amount !== undefined) {
    if (!Number.isFinite(input.amount) || input.amount < 0) return "Amount must be a positive number.";
    if (input.amount > MAX_AMOUNT) return "Amount is too large.";
  }
  if (input.currency !== undefined && !SUPPORTED_CURRENCIES.includes(input.currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}.`;
  }
  if (input.category !== undefined && !Object.values(DbMonetizationCategory).includes(input.category as DbMonetizationCategory)) {
    return "Choose a valid category.";
  }
  if (input.provider !== undefined && !Object.values(DbMonetizationProvider).includes(input.provider as DbMonetizationProvider)) {
    return "Choose a valid provider.";
  }
  if (input.platform && !Object.values(DbPlatform).includes(input.platform as DbPlatform)) {
    return "Choose a valid platform.";
  }
  if (input.status !== undefined && !Object.values(DbMonetizationStatus).includes(input.status as DbMonetizationStatus)) {
    return "Choose a valid status.";
  }
  return null;
}

function toEntryDTO(row: {
  id: string;
  type: string;
  category: string;
  provider: string;
  platform: string | null;
  title: string;
  counterpartyName: string | null;
  description: string | null;
  status: string;
  amount: unknown;
  currency: string;
  date: Date;
  dueDate: Date | null;
  paidAt: Date | null;
}): MonetizationEntryRow {
  return {
    id: row.id,
    type: row.type as MonetizationEntryRow["type"],
    category: row.category as MonetizationEntryRow["category"],
    provider: row.provider as MonetizationEntryRow["provider"],
    platform: row.platform as Platform | null,
    title: row.title,
    counterpartyName: row.counterpartyName,
    description: row.description,
    status: row.status as MonetizationEntryRow["status"],
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date.toISOString(),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

async function findOwnedEntry(workspaceId: string, entryId: string) {
  return prisma.monetizationEntry.findFirst({ where: { id: entryId, workspaceId } });
}

export async function createMonetizationEntryAction(
  workspaceSlug: string,
  input: MonetizationEntryInput
): Promise<ActionResult<MonetizationEntryRow>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageMonetization")) return forbidden();

  const validationError = validateCommonFields(input);
  if (validationError) return { ok: false, error: validationError, code: "invalid" };

  const category = input.category as DbMonetizationCategory;
  const type = CATEGORY_TYPE[input.category] as DbMonetizationType;
  const id = randomUUID();

  const [entry] = await prisma.$transaction([
    prisma.monetizationEntry.create({
      data: {
        id,
        workspaceId: workspace.id,
        type,
        category,
        provider: (input.provider as DbMonetizationProvider) ?? DbMonetizationProvider.Manual,
        platform: (input.platform as DbPlatform) ?? null,
        title: input.title.trim(),
        counterpartyName: input.counterpartyName?.trim() || null,
        description: input.description?.trim() || null,
        status: (input.status as DbMonetizationStatus) ?? DbMonetizationStatus.Pending,
        amount: input.amount,
        currency: input.currency ?? "USD",
        date: input.date ? new Date(input.date) : new Date(),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        paidAt: input.status === "Paid" ? new Date() : null,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        monetizationEntryId: id,
        actorId: userId,
        actorName: userName,
        action: AuditAction.MonetizationEntryCreated,
        metadata: { title: input.title.trim(), category, amount: input.amount, currency: input.currency ?? "USD" },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/monetization`);
  return { ok: true, data: toEntryDTO(entry) };
}

export async function updateMonetizationEntryAction(
  workspaceSlug: string,
  entryId: string,
  input: Partial<MonetizationEntryInput>
): Promise<ActionResult<MonetizationEntryRow>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageMonetization")) return forbidden();

  const validationError = validateCommonFields(input);
  if (validationError) return { ok: false, error: validationError, code: "invalid" };

  const existing = await findOwnedEntry(workspace.id, entryId);
  if (!existing) return { ok: false, error: "Entry not found.", code: "not_found" };

  const category = (input.category as DbMonetizationCategory) ?? existing.category;
  const type = input.category ? (CATEGORY_TYPE[input.category] as DbMonetizationType) : existing.type;

  const [entry] = await prisma.$transaction([
    prisma.monetizationEntry.update({
      where: { id: entryId },
      data: {
        type,
        category,
        ...(input.provider !== undefined ? { provider: input.provider as DbMonetizationProvider } : {}),
        ...(input.platform !== undefined ? { platform: input.platform as DbPlatform | null } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.counterpartyName !== undefined ? { counterpartyName: input.counterpartyName?.trim() || null } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        monetizationEntryId: entryId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.MonetizationEntryUpdated,
        metadata: { fields: Object.keys(input) },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/monetization`);
  return { ok: true, data: toEntryDTO(entry) };
}

export async function updateMonetizationEntryStatusAction(
  workspaceSlug: string,
  entryId: string,
  status: MonetizationStatus
): Promise<ActionResult<MonetizationEntryRow>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageMonetization")) return forbidden();

  if (!Object.values(DbMonetizationStatus).includes(status as DbMonetizationStatus)) {
    return { ok: false, error: "Choose a valid status.", code: "invalid" };
  }

  const existing = await findOwnedEntry(workspace.id, entryId);
  if (!existing) return { ok: false, error: "Entry not found.", code: "not_found" };
  if (existing.status === status) {
    return { ok: false, error: `Entry is already ${status}.`, code: "invalid" };
  }

  const [entry] = await prisma.$transaction([
    prisma.monetizationEntry.update({
      where: { id: entryId },
      data: {
        status: status as DbMonetizationStatus,
        // First transition into Paid stamps paidAt; later transitions
        // keep the original paidAt as a historical record rather than
        // overwriting or clearing it.
        ...(status === "Paid" && !existing.paidAt ? { paidAt: new Date() } : {}),
      },
    }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        monetizationEntryId: entryId,
        actorId: userId,
        actorName: userName,
        action: AuditAction.MonetizationEntryStatusChanged,
        metadata: { from: existing.status, to: status },
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/monetization`);
  return { ok: true, data: toEntryDTO(entry) };
}

export async function deleteMonetizationEntryAction(
  workspaceSlug: string,
  entryId: string
): Promise<ActionResult<{ id: string }>> {
  const { workspace, userId, userName, role } = await requireWorkspaceAccess(workspaceSlug);
  if (!hasPermission(role, "manageMonetization")) return forbidden();

  const existing = await findOwnedEntry(workspace.id, entryId);
  if (!existing) return { ok: false, error: "Entry not found.", code: "not_found" };

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        // Not monetizationEntryId: the row is about to be deleted, and
        // this audit row should keep its snapshot even though the FK
        // would otherwise SetNull immediately.
        actorId: userId,
        actorName: userName,
        action: AuditAction.MonetizationEntryDeleted,
        metadata: {
          title: existing.title,
          category: existing.category,
          amount: Number(existing.amount),
          currency: existing.currency,
        },
      },
    }),
    prisma.monetizationEntry.delete({ where: { id: entryId } }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/monetization`);
  return { ok: true, data: { id: entryId } };
}

/** Not a mutation — the client-driven read behind search/filter/pagination on the entries table. */
export async function getMonetizationEntriesAction(workspaceSlug: string, filters: MonetizationFilters, cursor?: string) {
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  return getMonetizationEntries(workspace.id, filters, cursor);
}

/** Not a mutation — lets the client re-fetch the summary/category/timeline cards after a mutation without a full page refresh (which would also reset the entries table's active filters). */
export async function getMonetizationOverviewAction(workspaceSlug: string) {
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);
  return getMonetizationOverview(workspace.id);
}
