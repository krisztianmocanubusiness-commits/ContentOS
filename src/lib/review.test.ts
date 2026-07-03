import { describe, expect, it } from "vitest";

import { applyReviewAction } from "./review";
import type { ContentItem } from "./mock-data";

const actor = { name: "You", initials: "YO" };

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "c1",
    workspaceId: "keris",
    title: "Test post",
    status: "Draft",
    platform: "Instagram",
    date: "Jul 1",
    author: "Ava R.",
    authorInitials: "AR",
    body: "body",
    tags: [],
    assetIds: [],
    comments: [],
    reviewHistory: [],
    ...overrides,
  };
}

describe("applyReviewAction", () => {
  it("moves a Draft to Needs Review on submit", () => {
    const result = applyReviewAction(makeItem({ status: "Draft" }), "submitted", actor);
    expect(result.status).toBe("Needs Review");
    expect(result.reviewHistory).toHaveLength(1);
    expect(result.reviewHistory[0]).toMatchObject({
      action: "submitted",
      by: "You",
      byInitials: "YO",
    });
  });

  it("moves Needs Review to Scheduled on approve", () => {
    const result = applyReviewAction(makeItem({ status: "Needs Review" }), "approved", actor);
    expect(result.status).toBe("Scheduled");
  });

  it("sends Needs Review back to Draft on request-changes, keeping the note", () => {
    const result = applyReviewAction(
      makeItem({ status: "Needs Review" }),
      "changes_requested",
      actor,
      { note: "Fix the cover photo" }
    );
    expect(result.status).toBe("Draft");
    expect(result.reviewHistory[0].note).toBe("Fix the cover photo");
  });

  it("appends to existing history instead of replacing it", () => {
    const item = makeItem({
      status: "Needs Review",
      reviewHistory: [
        { id: "c1-rv1", action: "submitted", by: "Ava Reyes", byInitials: "AR", timestamp: "4h ago" },
      ],
    });
    const result = applyReviewAction(item, "approved", actor);
    expect(result.reviewHistory).toHaveLength(2);
    expect(result.reviewHistory[0].action).toBe("submitted");
    expect(result.reviewHistory[1].action).toBe("approved");
  });

  it("does not mutate the original item", () => {
    const item = makeItem({ status: "Draft" });
    applyReviewAction(item, "submitted", actor);
    expect(item.status).toBe("Draft");
    expect(item.reviewHistory).toHaveLength(0);
  });
});
