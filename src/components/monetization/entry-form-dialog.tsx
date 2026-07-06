"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MonetizationEntryInput } from "@/lib/monetization-actions";
import type { MonetizationEntryRow } from "@/lib/monetization-data";
import {
  ALL_CATEGORIES,
  MONETIZATION_CATEGORY_LABEL,
  MONETIZATION_PROVIDER_LABEL,
  MONETIZATION_STATUS_LABEL,
  MONETIZATION_STATUSES,
  SUPPORTED_CURRENCIES,
  type MonetizationCategory,
  type MonetizationProvider,
  type MonetizationStatus,
} from "@/lib/monetization-types";
import type { Platform } from "@/lib/mock-data";

const PLATFORM_OPTIONS: Platform[] = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "LinkedIn",
  "Facebook",
  "Threads",
  "Pinterest",
];

const PROVIDER_OPTIONS: MonetizationProvider[] = ["Manual", "YouTube", "TikTok", "Patreon", "Stripe", "LemonSqueezy"];

const NONE = "none";

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export function EntryFormDialog({
  open,
  onOpenChange,
  isPending,
  entry,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  /** null for create, a row for edit. */
  entry: MonetizationEntryRow | null;
  onSubmit: (input: MonetizationEntryInput) => void;
}) {
  // Lazy initializers read `entry` only once, at mount — the parent
  // remounts this component (via a `key` tied to the target entry) every
  // time it opens for a different entry or for a fresh create, so there's
  // no effect needed to "reset" state when the target changes.
  const [category, setCategory] = React.useState<MonetizationCategory>(entry?.category ?? "Sponsorship");
  const [title, setTitle] = React.useState(entry?.title ?? "");
  const [counterpartyName, setCounterpartyName] = React.useState(entry?.counterpartyName ?? "");
  const [description, setDescription] = React.useState(entry?.description ?? "");
  const [amount, setAmount] = React.useState(entry ? String(entry.amount) : "");
  const [currency, setCurrency] = React.useState(entry?.currency ?? "USD");
  const [status, setStatus] = React.useState<MonetizationStatus>(entry?.status ?? "Pending");
  const [provider, setProvider] = React.useState<MonetizationProvider>(entry?.provider ?? "Manual");
  const [platform, setPlatform] = React.useState<string>(entry?.platform ?? NONE);
  const [date, setDate] = React.useState(() => toDateInputValue(entry?.date) || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState(() => toDateInputValue(entry?.dueDate));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const parsedAmount = Number(amount);
    if (!trimmedTitle || !Number.isFinite(parsedAmount)) return;

    onSubmit({
      category,
      title: trimmedTitle,
      counterpartyName: counterpartyName.trim() || null,
      description: description.trim() || null,
      amount: parsedAmount,
      currency,
      status,
      provider,
      platform: platform === NONE ? null : (platform as Platform),
      date,
      dueDate: dueDate || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "New entry"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Update this revenue or expense entry."
              : "Track a sponsorship deal, affiliate payout, platform revenue, merch sale, digital product sale, other income, or an expense."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as MonetizationCategory)} disabled={isPending}>
                <SelectTrigger id="entry-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MONETIZATION_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MonetizationStatus)} disabled={isPending}>
                <SelectTrigger id="entry-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONETIZATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MONETIZATION_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              placeholder="e.g. Instagram reel package"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-counterparty">Brand / counterparty</Label>
            <Input
              id="entry-counterparty"
              placeholder="e.g. Glowlux Skincare"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-amount">Amount</Label>
              <Input
                id="entry-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={isPending}>
                <SelectTrigger id="entry-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-date">Date</Label>
              <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-due-date">Due date</Label>
              <Input
                id="entry-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-provider">Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as MonetizationProvider)} disabled={isPending}>
                <SelectTrigger id="entry-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {MONETIZATION_PROVIDER_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform} disabled={isPending}>
                <SelectTrigger id="entry-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-description">Notes</Label>
            <Textarea
              id="entry-description"
              placeholder="Optional details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {entry ? "Save changes" : "Create entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
