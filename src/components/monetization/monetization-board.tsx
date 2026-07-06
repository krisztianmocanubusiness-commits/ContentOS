"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { PermissionButton } from "@/components/permissions/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermission } from "@/hooks/use-permission";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  createMonetizationEntryAction,
  deleteMonetizationEntryAction,
  getMonetizationEntriesAction,
  getMonetizationOverviewAction,
  updateMonetizationEntryAction,
  updateMonetizationEntryStatusAction,
  type MonetizationEntryInput,
} from "@/lib/monetization-actions";
import type {
  MonetizationEntryRow,
  MonetizationFilters,
  MonetizationOverview,
} from "@/lib/monetization-data";
import {
  ALL_CATEGORIES,
  MONETIZATION_CATEGORY_LABEL,
  MONETIZATION_STATUS_LABEL,
  MONETIZATION_STATUSES,
  isOverdue,
  type MonetizationCategory,
  type MonetizationStatus,
  type MonetizationType,
} from "@/lib/monetization-types";
import { monetizationStatusVariant } from "@/lib/status";
import { MonthlyRevenueChart } from "@/components/monetization/monthly-revenue-chart";
import { EntryFormDialog } from "@/components/monetization/entry-form-dialog";

const ALL = "all";

function StatCard({
  label,
  value,
  changePct,
  positiveIsGood = true,
}: {
  label: string;
  value: string;
  changePct: number | null;
  positiveIsGood?: boolean;
}) {
  const isGood = changePct === null ? null : positiveIsGood ? changePct >= 0 : changePct <= 0;
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {changePct === null ? (
          <span className="text-xs text-muted-foreground">vs. last month: —</span>
        ) : (
          <span
            className={
              "inline-flex items-center gap-1 text-xs font-medium " +
              (isGood ? "text-success" : "text-destructive")
            }
          >
            {changePct >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(changePct).toFixed(1)}% vs. last month
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export function MonetizationBoard({
  workspaceSlug,
  workspaceName,
  initialOverview,
  initialEntries,
}: {
  workspaceSlug: string;
  workspaceName: string;
  initialOverview: MonetizationOverview;
  initialEntries: { items: MonetizationEntryRow[]; nextCursor: string | null; total: number };
}) {
  const canManage = usePermission("manageMonetization");

  const [overview, setOverview] = React.useState(initialOverview);
  const { summary, categoryBreakdown, timeline } = overview;

  const [entries, setEntries] = React.useState(initialEntries.items);
  const [nextCursor, setNextCursor] = React.useState(initialEntries.nextCursor);
  const [total, setTotal] = React.useState(initialEntries.total);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<MonetizationType | typeof ALL>(ALL);
  const [categoryFilter, setCategoryFilter] = React.useState<MonetizationCategory | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = React.useState<MonetizationStatus | typeof ALL>(ALL);

  const [isListPending, setIsListPending] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [isMutationPending, setIsMutationPending] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<MonetizationEntryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MonetizationEntryRow | null>(null);

  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters = React.useMemo<MonetizationFilters>(
    () => ({
      search: search.trim() || undefined,
      type: typeFilter === ALL ? undefined : typeFilter,
      category: categoryFilter === ALL ? undefined : categoryFilter,
      status: statusFilter === ALL ? undefined : statusFilter,
    }),
    [search, typeFilter, categoryFilter, statusFilter]
  );

  async function reload(nextFilters: MonetizationFilters) {
    setIsListPending(true);
    try {
      const result = await getMonetizationEntriesAction(workspaceSlug, nextFilters);
      setEntries(result.items);
      setNextCursor(result.nextCursor);
      setTotal(result.total);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsListPending(false);
    }
  }

  function refreshOverview() {
    getMonetizationOverviewAction(workspaceSlug).then(setOverview);
  }

  function applyFilters(nextFilters: MonetizationFilters) {
    reload(nextFilters);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      applyFilters({ ...filters, search: value.trim() || undefined });
    }, 250);
  }

  function handleTypeChange(value: string) {
    const next = value as MonetizationType | typeof ALL;
    setTypeFilter(next);
    applyFilters({ ...filters, type: next === ALL ? undefined : next });
  }

  function handleCategoryChange(value: string) {
    const next = value as MonetizationCategory | typeof ALL;
    setCategoryFilter(next);
    applyFilters({ ...filters, category: next === ALL ? undefined : next });
  }

  function handleStatusChange(value: string) {
    const next = value as MonetizationStatus | typeof ALL;
    setStatusFilter(next);
    applyFilters({ ...filters, status: next === ALL ? undefined : next });
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getMonetizationEntriesAction(workspaceSlug, filters, nextCursor);
      setEntries((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setTotal(result.total);
    } finally {
      setLoadingMore(false);
    }
  }

  function openCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEdit(entry: MonetizationEntryRow) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  function handleFormSubmit(input: MonetizationEntryInput) {
    setIsMutationPending(true);
    const action = editingEntry
      ? updateMonetizationEntryAction(workspaceSlug, editingEntry.id, input)
      : createMonetizationEntryAction(workspaceSlug, input);

    action.then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        toast.success(editingEntry ? "Entry updated." : "Entry created.");
        setFormOpen(false);
        reload(filters);
        refreshOverview();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleStatusMenuChange(entry: MonetizationEntryRow, status: MonetizationStatus) {
    setIsMutationPending(true);
    updateMonetizationEntryStatusAction(workspaceSlug, entry.id, status).then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        toast.success(`Marked ${MONETIZATION_STATUS_LABEL[status].toLowerCase()}.`);
        reload(filters);
        refreshOverview();
      } else {
        toast.error(result.error);
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setIsMutationPending(true);
    deleteMonetizationEntryAction(workspaceSlug, deleteTarget.id).then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        toast.success("Entry deleted.");
        setDeleteTarget(null);
        reload(filters);
        refreshOverview();
      } else {
        toast.error(result.error);
      }
    });
  }

  const filtersActive = Boolean(search.trim()) || typeFilter !== ALL || categoryFilter !== ALL || statusFilter !== ALL;

  return (
    <div>
      <PageHeader
        title="Monetization"
        description={`Revenue and expenses for ${workspaceName}.`}
        action={
          <PermissionButton permission="manageMonetization" onClick={openCreate}>
            <Plus />
            New entry
          </PermissionButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(summary.totalRevenue, summary.currency)} changePct={summary.revenueChangePct} />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(summary.totalExpenses, summary.currency)}
          changePct={summary.expensesChangePct}
          positiveIsGood={false}
        />
        <StatCard label="Net Profit" value={formatCurrency(summary.netProfit, summary.currency)} changePct={summary.netProfitChangePct} />
        <StatCard label="Pending Revenue" value={formatCurrency(summary.pendingRevenue, summary.currency)} changePct={null} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue timeline</CardTitle>
            <CardDescription>Paid income vs. expenses, last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <MonthlyRevenueChart data={timeline} currency={summary.currency} />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Income</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeline.map((bucket) => (
                    <TableRow key={bucket.monthLabel}>
                      <TableCell className="font-medium">{bucket.monthLabel}</TableCell>
                      <TableCell className="text-chart-income">{formatCurrency(bucket.income, summary.currency)}</TableCell>
                      <TableCell className="text-chart-expense">{formatCurrency(bucket.expenses, summary.currency)}</TableCell>
                      <TableCell className={bucket.net >= 0 ? "text-success" : "text-destructive"}>
                        {formatCurrency(bucket.net, summary.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by source</CardTitle>
            <CardDescription>Paid income, last 90 days.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {categoryBreakdown.every((c) => c.total === 0) ? (
              <p className="text-sm text-muted-foreground">No paid revenue in the last 90 days.</p>
            ) : (
              categoryBreakdown
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((c) => (
                  <div key={c.category} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{MONETIZATION_CATEGORY_LABEL[c.category]}</span>
                    <span className="font-medium">{formatCurrency(c.total, summary.currency)}</span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search entries..."
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="Income">Income</SelectItem>
            <SelectItem value="Expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {MONETIZATION_CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {MONETIZATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {MONETIZATION_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={isListPending ? "mt-4 opacity-60 transition-opacity" : "mt-4 transition-opacity"}>
        <Card className="hidden overflow-hidden py-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                {canManage && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Couldn&apos;t load entries. Try again shortly.
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {filtersActive ? "No entries match your filters." : `No revenue or expenses tracked yet in ${workspaceName}.`}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{entry.title}</span>
                        {entry.counterpartyName && (
                          <span className="text-xs text-muted-foreground">{entry.counterpartyName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{MONETIZATION_CATEGORY_LABEL[entry.category]}</TableCell>
                    <TableCell className={entry.type === "Expense" ? "text-chart-expense" : ""}>
                      {entry.type === "Expense" ? "-" : ""}
                      {formatCurrency(entry.amount, entry.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={monetizationStatusVariant(entry.status)}>{MONETIZATION_STATUS_LABEL[entry.status]}</Badge>
                        {isOverdue(entry.status, entry.dueDate) && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.dueDate ? formatShortDate(new Date(entry.dueDate)) : "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <EntryRowMenu
                          entry={entry}
                          disabled={isMutationPending}
                          onEdit={() => openEdit(entry)}
                          onStatusChange={(status) => handleStatusMenuChange(entry, status)}
                          onDelete={() => setDeleteTarget(entry)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="flex flex-col gap-3 md:hidden">
          {loadError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Couldn&apos;t load entries. Try again shortly.</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {filtersActive ? "No entries match your filters." : `No revenue or expenses tracked yet in ${workspaceName}.`}
            </p>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{entry.title}</span>
                    {entry.counterpartyName && (
                      <span className="truncate text-xs text-muted-foreground">{entry.counterpartyName}</span>
                    )}
                  </div>
                  {canManage && (
                    <EntryRowMenu
                      entry={entry}
                      disabled={isMutationPending}
                      onEdit={() => openEdit(entry)}
                      onStatusChange={(status) => handleStatusMenuChange(entry, status)}
                      onDelete={() => setDeleteTarget(entry)}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={"text-sm font-medium " + (entry.type === "Expense" ? "text-chart-expense" : "")}>
                    {entry.type === "Expense" ? "-" : ""}
                    {formatCurrency(entry.amount, entry.currency)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={monetizationStatusVariant(entry.status)}>{MONETIZATION_STATUS_LABEL[entry.status]}</Badge>
                    {isOverdue(entry.status, entry.dueDate) && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{MONETIZATION_CATEGORY_LABEL[entry.category]}</span>
                  <span>{entry.dueDate ? `Due ${formatShortDate(new Date(entry.dueDate))}` : ""}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading..." : `Load more (${entries.length} of ${total})`}
            </Button>
          </div>
        )}
      </div>

      <EntryFormDialog
        key={`${editingEntry?.id ?? "create"}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        isPending={isMutationPending}
        entry={editingEntry}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entry</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteTarget?.title}&quot;? This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isMutationPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isMutationPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryRowMenu({
  entry,
  disabled,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  entry: MonetizationEntryRow;
  disabled: boolean;
  onEdit: () => void;
  onStatusChange: (status: MonetizationStatus) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={disabled} aria-label={`Actions for ${entry.title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {MONETIZATION_STATUSES.filter((s) => s !== entry.status).map((s) => (
          <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
            Mark {MONETIZATION_STATUS_LABEL[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
