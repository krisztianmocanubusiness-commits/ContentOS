"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
import {
  addCommentAction,
  approveContentAction,
  requestChangesAction,
  submitForReviewAction,
} from "@/lib/content-actions";
import type { ContentItem, ContentStatus, Platform } from "@/lib/mock-data";
import { statusVariant } from "@/lib/status";

const filters: { label: string; status: ContentStatus | "All" }[] = [
  { label: "All", status: "All" },
  { label: "Drafts", status: "Draft" },
  { label: "Scheduled", status: "Scheduled" },
  { label: "Needs Review", status: "Needs Review" },
  { label: "Published", status: "Published" },
];

export function ContentBoard({
  workspaceSlug,
  workspaceName,
  initialItems,
}: {
  workspaceSlug: string;
  workspaceName: string;
  initialItems: ContentItem[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [items, setItems] = React.useState(initialItems);
  const [search, setSearch] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform | "All">("All");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // React doesn't reset local state just because a prop changed — this is
  // the React-docs-sanctioned way to do it during render (not an effect),
  // so a router.refresh() after a conflict (or any future server
  // revalidation) actually replaces stale local items with the refetch.
  const [prevInitialItems, setPrevInitialItems] = React.useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  function showErrorToast(message: string, code: "forbidden" | "not_found" | "invalid" | "conflict") {
    if (code === "conflict") {
      toast.error(message, { action: { label: "Refresh", onClick: () => router.refresh() } });
    } else {
      toast.error(message);
    }
  }

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
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticComment = {
      id: tempId,
      author: session?.user?.name ?? "You",
      authorInitials: session?.user?.initials ?? "YO",
      body,
      timestamp: "Just now",
    };

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, comments: [...item.comments, optimisticComment] }
          : item
      )
    );

    startTransition(async () => {
      const result = await addCommentAction(workspaceSlug, itemId, body);
      if (result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  comments: item.comments.map((comment) =>
                    comment.id === tempId ? result.data : comment
                  ),
                }
              : item
          )
        );
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, comments: item.comments.filter((comment) => comment.id !== tempId) }
              : item
          )
        );
        showErrorToast(result.error, result.code);
      }
    });
  }

  function submitForReview(itemId: string) {
    startTransition(async () => {
      const result = await submitForReviewAction(workspaceSlug, itemId);
      if (result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: result.data.status,
                  reviewHistory: [...item.reviewHistory, result.data.reviewEvent],
                }
              : item
          )
        );
        toast.success("Submitted for review.");
      } else {
        showErrorToast(result.error, result.code);
      }
    });
  }

  function approveItem(itemId: string) {
    startTransition(async () => {
      const result = await approveContentAction(workspaceSlug, itemId);
      if (result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: result.data.status,
                  reviewHistory: [...item.reviewHistory, result.data.reviewEvent],
                }
              : item
          )
        );
        toast.success("Approved and scheduled.");
      } else {
        showErrorToast(result.error, result.code);
      }
    });
  }

  function requestChanges(itemId: string, reason: string) {
    startTransition(async () => {
      const result = await requestChangesAction(workspaceSlug, itemId, reason);
      if (result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: result.data.status,
                  reviewHistory: [...item.reviewHistory, result.data.reviewEvent],
                }
              : item
          )
        );
        toast.success("Changes requested.");
      } else {
        showErrorToast(result.error, result.code);
      }
    });
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
        pending={isPending}
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
