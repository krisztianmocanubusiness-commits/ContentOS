import type { AssetType } from "@/lib/asset-types";

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  plan: "Free" | "Pro" | "Team";
  initials: string;
};

// Workspace records now come from the database (see prisma/seed.ts for
// the equivalent seed data) via WorkspaceProvider — this file only keeps
// the Workspace type, which everything below still keys off of.

export type Platform =
  | "Instagram"
  | "TikTok"
  | "X"
  | "LinkedIn"
  | "YouTube"
  | "Facebook"
  | "Threads"
  | "Pinterest";

export type ContentStatus = "Draft" | "Scheduled" | "Published" | "Needs Review";

export type ContentComment = {
  id: string;
  author: string;
  authorInitials: string;
  body: string;
  timestamp: string;
};

export type ReviewAction = "submitted" | "approved" | "changes_requested";

export type ReviewEvent = {
  id: string;
  action: ReviewAction;
  by: string;
  byInitials: string;
  timestamp: string;
  note?: string;
};

export type ContentItem = {
  id: string;
  workspaceId: string;
  title: string;
  status: ContentStatus;
  platform: Platform;
  date: string;
  author: string;
  authorInitials: string;
  /** Caption / script / post body. */
  body: string;
  tags: string[];
  linkedAssets: { id: string; name: string; type: AssetType }[];
  comments: ContentComment[];
  reviewHistory: ReviewEvent[];
};

export type CalendarEvent = {
  id: string;
  workspaceId: string;
  /** ISO date (yyyy-mm-dd) the post is scheduled for. */
  date: string;
  /** Time of day, e.g. "9:00 AM". */
  time: string;
  title: string;
  platform: Platform;
};

export type TeamRole =
  | "Owner"
  | "Admin"
  | "Manager"
  | "Editor"
  | "Moderator"
  | "Analyst"
  | "Viewer";

