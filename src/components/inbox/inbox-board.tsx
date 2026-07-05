"use client";

import * as React from "react";
import { Archive, ArchiveRestore, CheckCircle2, RotateCcw, Send, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/use-permission";
import {
  addConversationNoteAction,
  archiveConversationAction,
  assignConversationAction,
  getConversationDetailAction,
  getConversationsAction,
  markConversationReadAction,
  reopenConversationAction,
  replyToConversationAction,
  resolveConversationAction,
  unarchiveConversationAction,
} from "@/lib/inbox-actions";
import type {
  AssignedMember,
  ConversationDetail,
  ConversationFilters,
  ConversationSummary,
} from "@/lib/inbox-data";
import { INBOX_ITEM_TYPES, INBOX_ITEM_TYPE_LABEL, type InboxItemType } from "@/lib/inbox-types";
import type { Platform } from "@/lib/mock-data";
import { platformColor } from "@/lib/platform";
import { conversationStatusVariant } from "@/lib/status";
import { cn } from "@/lib/utils";

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

const ALL = "all";
const UNASSIGNED = "unassigned";

export function InboxBoard({
  workspaceSlug,
  workspaceName,
  initialConversations,
  initialNextCursor,
  initialCounts,
  members,
}: {
  workspaceSlug: string;
  workspaceName: string;
  initialConversations: ConversationSummary[];
  initialNextCursor: string | null;
  initialCounts: { total: number; unread: number };
  members: AssignedMember[];
}) {
  const canManage = usePermission("manageInbox");

  const [conversations, setConversations] = React.useState(initialConversations);
  const [nextCursor, setNextCursor] = React.useState(initialNextCursor);
  const [counts, setCounts] = React.useState(initialCounts);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [detail, setDetail] = React.useState<ConversationDetail | null>(null);
  const [detailError, setDetailError] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [noteDraft, setNoteDraft] = React.useState("");
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<InboxItemType | typeof ALL>(ALL);
  const [platformFilter, setPlatformFilter] = React.useState<Platform | typeof ALL>(ALL);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);

  const [isListPending, setIsListPending] = React.useState(false);
  const [isMutationPending, setIsMutationPending] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters = React.useMemo<ConversationFilters>(
    () => ({
      search: search.trim() || undefined,
      type: typeFilter === ALL ? undefined : typeFilter,
      platform: platformFilter === ALL ? undefined : platformFilter,
      unreadOnly: unreadOnly || undefined,
      archived: showArchived,
    }),
    [search, typeFilter, platformFilter, unreadOnly, showArchived]
  );

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  /** Fetches the full thread + notes for a conversation — called from click handlers, never from an effect. */
  function loadDetail(conversationId: string) {
    setDetail(null);
    setDetailError(false);
    getConversationDetailAction(workspaceSlug, conversationId)
      .then(setDetail)
      .catch(() => setDetailError(true));
  }

  async function reload(nextFilters: ConversationFilters, opts?: { preserveSelection?: boolean }) {
    setIsListPending(true);
    try {
      const result = await getConversationsAction(workspaceSlug, nextFilters);
      setConversations(result.items);
      setNextCursor(result.nextCursor);
      setCounts(result.counts);
      setLoadError(false);

      const preserved = opts?.preserveSelection && selectedId && result.items.some((c) => c.id === selectedId);
      const nextSelected = preserved ? selectedId : (result.items[0]?.id ?? null);
      setSelectedId(nextSelected);
      if (nextSelected) loadDetail(nextSelected);
      else setDetail(null);
    } catch {
      setLoadError(true);
    } finally {
      setIsListPending(false);
    }
  }

  function applyFilters(nextFilters: ConversationFilters) {
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
    const next = value as InboxItemType | typeof ALL;
    setTypeFilter(next);
    applyFilters({ ...filters, type: next === ALL ? undefined : next });
  }

  function handlePlatformChange(value: string) {
    const next = value as Platform | typeof ALL;
    setPlatformFilter(next);
    applyFilters({ ...filters, platform: next === ALL ? undefined : next });
  }

  function handleUnreadToggle() {
    const next = !unreadOnly;
    setUnreadOnly(next);
    applyFilters({ ...filters, unreadOnly: next || undefined });
  }

  function handleArchivedToggle() {
    const next = !showArchived;
    setShowArchived(next);
    applyFilters({ ...filters, archived: next });
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getConversationsAction(workspaceSlug, filters, nextCursor);
      setConversations((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setCounts(result.counts);
    } finally {
      setLoadingMore(false);
    }
  }

  function selectConversation(id: string) {
    setSelectedId(id);
    loadDetail(id);

    if (canManage) {
      const conversation = conversations.find((c) => c.id === id);
      if (conversation?.unread) {
        markConversationReadAction(workspaceSlug, id).then((result) => {
          if (!result.ok) return;
          setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
          setCounts((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
        });
      }
    }
  }

  function refreshAfterMutation() {
    reload(filters, { preserveSelection: true });
  }

  function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !selected) return;
    setIsMutationPending(true);
    replyToConversationAction(workspaceSlug, selected.id, trimmed).then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        setDraft("");
        refreshAfterMutation();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = noteDraft.trim();
    if (!trimmed || !selected) return;
    setIsMutationPending(true);
    addConversationNoteAction(workspaceSlug, selected.id, trimmed).then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        setNoteDraft("");
        refreshAfterMutation();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAssign(value: string) {
    if (!selected) return;
    setIsMutationPending(true);
    assignConversationAction(workspaceSlug, selected.id, value === UNASSIGNED ? null : value).then(
      (result) => {
        setIsMutationPending(false);
        if (result.ok) {
          refreshAfterMutation();
        } else {
          toast.error(result.error);
        }
      }
    );
  }

  function handleToggleArchive() {
    if (!selected) return;
    setIsMutationPending(true);
    const action = selected.archived ? unarchiveConversationAction : archiveConversationAction;
    action(workspaceSlug, selected.id).then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        toast.success(selected.archived ? "Conversation unarchived." : "Conversation archived.");
        refreshAfterMutation();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleResolved() {
    if (!selected) return;
    setIsMutationPending(true);
    const action = selected.status === "Resolved" ? reopenConversationAction : resolveConversationAction;
    action(workspaceSlug, selected.id).then((result) => {
      setIsMutationPending(false);
      if (result.ok) {
        toast.success(selected.status === "Resolved" ? "Conversation reopened." : "Conversation resolved.");
        refreshAfterMutation();
      } else {
        toast.error(result.error);
      }
    });
  }

  const filtersActive =
    Boolean(search.trim()) || typeFilter !== ALL || platformFilter !== ALL || unreadOnly || showArchived;

  return (
    <div>
      <PageHeader
        title="Inbox"
        description={`Unified DMs and comments across ${workspaceName}'s channels.`}
      />

      <Card className="flex h-[600px] overflow-hidden p-0">
        <div className="flex w-full max-w-xs shrink-0 flex-col border-r border-border">
          <div className="flex flex-col gap-2 border-b border-border p-2.5">
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="h-8 text-sm"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger size="sm" className="h-7 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {INBOX_ITEM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {INBOX_ITEM_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={handlePlatformChange}>
                <SelectTrigger size="sm" className="h-7 text-xs">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All platforms</SelectItem>
                  {PLATFORM_OPTIONS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={unreadOnly ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={handleUnreadToggle}
              >
                Unread
              </Button>
              <Button
                type="button"
                variant={showArchived ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={handleArchivedToggle}
              >
                Archived
              </Button>
            </div>
          </div>

          <div className="border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
            {counts.total === 0
              ? "No conversations"
              : `${counts.unread} unread · ${counts.total} total`}
          </div>
          <div
            className={cn(
              "flex-1 overflow-y-auto transition-opacity",
              isListPending && "opacity-60"
            )}
          >
            {loadError ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Couldn&apos;t load conversations. Try again shortly.
              </p>
            ) : conversations.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {filtersActive
                  ? "No conversations match your filters."
                  : `No messages yet in ${workspaceName}.`}
              </p>
            ) : (
              <>
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/60",
                      selected?.id === conversation.id && "bg-accent"
                    )}
                  >
                    <Avatar className="mt-0.5">
                      <AvatarFallback className={cn("text-white", platformColor[conversation.platform])}>
                        {conversation.contactInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{conversation.contactName}</span>
                          {conversation.type !== "DirectMessage" && (
                            <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px]">
                              {INBOX_ITEM_TYPE_LABEL[conversation.type]}
                            </Badge>
                          )}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {conversation.lastMessageAt}
                        </span>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {conversation.lastMessageBody}
                      </span>
                    </div>
                    {conversation.unread && conversation.id !== selected?.id && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
                {nextCursor && (
                  <div className="p-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={loadingMore}
                      onClick={loadMore}
                    >
                      {loadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation to get started.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarFallback className={cn("text-white", platformColor[selected.platform])}>
                      {selected.contactInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{selected.contactName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {detail?.contactHandle ?? ""} · {selected.platform}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={conversationStatusVariant(selected.status)}>{selected.status}</Badge>
                  <Select
                    value={selected.assignedTo?.membershipId ?? UNASSIGNED}
                    onValueChange={handleAssign}
                    disabled={!canManage || isMutationPending}
                  >
                    <SelectTrigger size="sm" className="h-8 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.membershipId} value={member.membershipId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canManage || isMutationPending}
                    onClick={handleToggleResolved}
                    title={selected.status === "Resolved" ? "Reopen" : "Resolve"}
                  >
                    {selected.status === "Resolved" ? <RotateCcw /> : <CheckCircle2 />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canManage || isMutationPending}
                    onClick={handleToggleArchive}
                    title={selected.archived ? "Unarchive" : "Archive"}
                  >
                    {selected.archived ? <ArchiveRestore /> : <Archive />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNotesOpen(true)}
                    title="Internal notes"
                  >
                    <StickyNote />
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {detailError ? (
                  <p className="m-auto text-sm text-muted-foreground">
                    Couldn&apos;t load this conversation. Try again shortly.
                  </p>
                ) : !detail ? (
                  <p className="m-auto text-sm text-muted-foreground">Loading conversation...</p>
                ) : detail.messages.length === 0 ? (
                  <p className="m-auto text-sm text-muted-foreground">No messages in this conversation yet.</p>
                ) : (
                  detail.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col gap-1",
                        message.from === "you" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-md rounded-2xl px-4 py-2 text-sm",
                          message.from === "you"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {message.body}
                      </div>
                      <span className="px-1 text-[11px] text-muted-foreground">{message.timestamp}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-border p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1"
                  disabled={!canManage || isMutationPending}
                />
                <Button type="submit" size="icon" disabled={!canManage || isMutationPending || !draft.trim()}>
                  <Send />
                </Button>
              </form>
            </>
          )}
        </div>
      </Card>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Internal notes</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {!detail || detail.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No internal notes yet. Notes are only visible to your team.
              </p>
            ) : (
              detail.notes.map((note) => (
                <div key={note.id} className="rounded-md border border-border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{note.authorName}</span>
                    <span className="text-[11px] text-muted-foreground">{note.timestamp}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                </div>
              ))
            )}
          </div>
          {canManage && (
            <form onSubmit={handleAddNote} className="flex flex-col gap-2 border-t border-border p-4">
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add an internal note..."
                disabled={isMutationPending}
              />
              <Button type="submit" size="sm" disabled={isMutationPending || !noteDraft.trim()}>
                Add note
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
