import type { ContentItem, ContentStatus, ReviewAction } from "@/lib/mock-data";

/** The only state transitions the approval workflow allows. */
export const REVIEW_ACTION_NEXT_STATUS: Record<ReviewAction, ContentStatus> = {
  submitted: "Needs Review",
  approved: "Scheduled",
  changes_requested: "Draft",
};

/**
 * Applies one review action to a content item: advances its status per
 * REVIEW_ACTION_NEXT_STATUS and appends an entry to its review history.
 * Pure — callers own persisting/setting the result.
 */
export function applyReviewAction(
  item: ContentItem,
  action: ReviewAction,
  actor: { name: string; initials: string },
  options: { note?: string; timestamp?: string } = {}
): ContentItem {
  return {
    ...item,
    status: REVIEW_ACTION_NEXT_STATUS[action],
    reviewHistory: [
      ...item.reviewHistory,
      {
        id: `${item.id}-rv${item.reviewHistory.length + 1}`,
        action,
        by: actor.name,
        byInitials: actor.initials,
        timestamp: options.timestamp ?? "Just now",
        note: options.note,
      },
    ],
  };
}
