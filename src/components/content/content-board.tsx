"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContentFilters } from "@/components/content/content-filters";
import { ContentDetailSheet } from "@/components/content/content-detail-sheet";
import { PermissionButton } from "@/components/permissions/permission-button";
import type { ContentItem, ContentStatus, Platform, ReviewAction } from "@/lib/mock-data";
import { applyReviewAction } from "@/lib/review";
import { statusVariant } from "@/lib/status";

const filters: { label: string; status: ContentStatus | "All" }[] = [
  { label: "All", status: "All" },
  { label: "Drafts", status: "Draft" },
  { label: "Scheduled", status: "Scheduled" },
  { label: "Needs Review", status: "Needs Review" },
  { label: "Published", status: "Published" },
];

export function ContentBoard({
  workspaceName,
  initialItems,
}: {
  workspaceName: string;
  initialItems: ContentItem[];
}) {
  const [items, setItems] = React.useState(initialItems);
  const [search, setSearch] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform | "All">("All");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);

  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    for (const item of initialItems) {
      for (const tag of item.tags) tags.add(tag);
    }
    return Array.from(tags).sort();
  }, [initialItems]);

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      item.title.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query);
    const matchesPlatform = platform === "All" || item.platform === platform;
    const matchesTag = !activeTag || item.tags.includes(activeTag);
    return matchesSearch && matchesPlatform && matchesTag;
  });

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  function addComment(itemId: string, body: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              comments: [
                ...item.comments,
                {
                  id: `${itemId}-c${item.comments.length + 1}`,
                  author: "You",
                  authorInitials: "YO",
                  body,
                  timestamp: "Just now",
                },
              ],
            }
          : item
      )
    );
  }

  function logReviewEvent(itemId: string, action: ReviewAction, note?: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? applyReviewAction(item, action, { name: "You", initials: "YO" }, { note })
          : item
      )
    );
  }

  function submitForReview(itemId: string) {
    logReviewEvent(itemId, "submitted");
  }

  function approveItem(itemId: string) {
    logReviewEvent(itemId, "approved");
  }

  function requestChanges(itemId: string, reason: string) {
    logReviewEvent(itemId, "changes_requested", reason);
  }

  return (
    <div>
      <PageHeader
        title="Content"
        description={`Every piece of content in ${workspaceName}'s pipeline.`}
        action={
          <PermissionButton permission="createContent">
            <Plus />
            New content
          </PermissionButton>
        }
      />

      <ContentFilters
        search={search}
        onSearchChange={setSearch}
        platform={platform}
        onPlatformChange={setPlatform}
        tags={availableTags}
        activeTag={activeTag}
        onTagToggle={(tag) => setActiveTag((prev) => (prev === tag ? null : tag))}
      />

      <Tabs defaultValue="All">
        <TabsList className="mb-4">
          {filters.map((filter) => (
            <TabsTrigger key={filter.status} value={filter.status}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {filters.map((filter) => {
          const rows =
            filter.status === "All"
              ? filteredItems
              : filteredItems.filter((item) => item.status === filter.status);

          const emptyMessage =
            items.length === 0
              ? `No content yet in ${workspaceName}.`
              : filteredItems.length === 0
                ? "No content matches your search or filters."
                : "No content in this view yet.";

          return (
            <TabsContent key={filter.status} value={filter.status}>
              <Card className="hidden overflow-hidden py-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item) => (
                      <TableRow
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className="cursor-pointer"
                      >
                        <TableCell className="max-w-xs font-medium">
                          <div className="flex flex-col gap-1">
                            <span className="truncate">{item.title}</span>
                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs font-normal text-muted-foreground"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.platform}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.author}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.date}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          {emptyMessage}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>

              <div className="flex flex-col gap-3 md:hidden">
                {rows.length === 0 ? (
                  <Card className="py-10 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </Card>
                ) : (
                  rows.map((item) => (
                    <Card
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="flex cursor-pointer flex-col gap-2 p-4 active:bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 flex-1 font-medium">
                          {item.title}
                        </span>
                        <Badge variant={statusVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {item.platform} · {item.author} · {item.date}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <ContentDetailSheet
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null);
        }}
        onAddComment={addComment}
        onSubmitForReview={submitForReview}
        onApprove={approveItem}
        onRequestChanges={requestChanges}
      />
    </div>
  );
}
