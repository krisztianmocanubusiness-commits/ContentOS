"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { conversations as seedConversations } from "@/lib/mock-data";
import { platformColor } from "@/lib/platform";
import { useWorkspace } from "@/context/workspace-context";

export default function InboxPage() {
  const { activeWorkspace } = useWorkspace();
  const [conversations, setConversations] = React.useState(seedConversations);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const workspaceConversations = conversations
    .filter((conversation) => conversation.workspaceId === activeWorkspace.id)
    .sort((a, b) => Number(b.unread) - Number(a.unread));

  const selected =
    workspaceConversations.find((c) => c.id === selectedId) ??
    workspaceConversations[0] ??
    null;

  function selectConversation(id: string) {
    setSelectedId(id);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id ? { ...conversation, unread: false } : conversation
      )
    );
  }

  function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !selected) return;
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                {
                  id: `${conversation.id}-${conversation.messages.length + 1}`,
                  from: "you",
                  body: trimmed,
                  timestamp: "Just now",
                },
              ],
            }
          : conversation
      )
    );
    setDraft("");
  }

  const unreadCount = workspaceConversations.filter(
    (c) => c.unread && c.id !== selected?.id
  ).length;

  return (
    <div>
      <PageHeader
        title="Inbox"
        description={`Unified DMs and comments across ${activeWorkspace.name}'s channels.`}
      />

      <Card className="flex h-[600px] overflow-hidden p-0">
        <div className="flex w-full max-w-xs shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
            {workspaceConversations.length === 0
              ? "No conversations"
              : `${unreadCount} unread · ${workspaceConversations.length} total`}
          </div>
          <div className="flex-1 overflow-y-auto">
            {workspaceConversations.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No messages yet in {activeWorkspace.name}.
              </p>
            ) : (
              workspaceConversations.map((conversation) => (
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
                    <AvatarFallback
                      className={cn(
                        "text-white",
                        platformColor[conversation.platform]
                      )}
                    >
                      {conversation.contactInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {conversation.contactName}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {conversation.lastMessageAt}
                      </span>
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {conversation.messages[conversation.messages.length - 1]?.body}
                    </span>
                  </div>
                  {conversation.unread && conversation.id !== selected?.id && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <Avatar>
                  <AvatarFallback
                    className={cn("text-white", platformColor[selected.platform])}
                  >
                    {selected.contactInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{selected.contactName}</span>
                  <span className="text-xs text-muted-foreground">
                    {selected.contactHandle} · {selected.platform}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {selected.messages.map((message) => (
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
                    <span className="px-1 text-[11px] text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>
                ))}
              </div>

              <form
                onSubmit={sendReply}
                className="flex items-center gap-2 border-t border-border p-3"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!draft.trim()}>
                  <Send />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation to get started.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
