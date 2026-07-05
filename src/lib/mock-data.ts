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

export const contentItems: ContentItem[] = [
  // Keris — personal creator brand
  {
    id: "c1", workspaceId: "keris", title: "Morning routine reel", status: "Scheduled", platform: "TikTok", date: "Jul 3",
    author: "Krisztián M.", authorInitials: "KM",
    body: "POV: 5am alarm hits and you still choose the sunrise walk. Full routine — cold plunge, journaling, matcha — link in bio for the journal I use.",
    tags: ["reel", "morning-routine", "lifestyle"],
    linkedAssets: [{ id: "a1", name: "morning-routine-final.mp4", type: "Video" }],
    comments: [],
    reviewHistory: [],
  },
  {
    id: "c2", workspaceId: "keris", title: "Outfit try-on carousel", status: "Draft", platform: "Instagram", date: "Jul 4",
    author: "Ava R.", authorInitials: "AR",
    body: "5 ways to style one blazer for fall. Swipe for the thrifted vs. new breakdown 👗",
    tags: ["ootd", "carousel", "fashion"],
    linkedAssets: [],
    comments: [
      { id: "cm1", author: "Ava Reyes", authorInitials: "AR", body: "Can we get the studio shots re-edited with warmer tones before this goes out?", timestamp: "1d ago" },
    ],
    reviewHistory: [],
  },
  {
    id: "c3", workspaceId: "keris", title: "Q&A Instagram Live recap", status: "Needs Review", platform: "Instagram", date: "Jul 6",
    author: "Mila Chen", authorInitials: "MC",
    body: "Recap carousel from last night's Live — answering your top 10 questions about the skincare routine, the move, and what's next for the podcast.",
    tags: ["live", "qna", "community"],
    linkedAssets: [],
    comments: [
      { id: "cm2", author: "Krisztián Mocanu", authorInitials: "KM", body: "Love this — can we swap slide 4 to lead with the podcast announcement instead?", timestamp: "3h ago" },
      { id: "cm3", author: "Mila Chen", authorInitials: "MC", body: "Good call, updating now.", timestamp: "2h ago" },
    ],
    reviewHistory: [
      { id: "rv1", action: "submitted", by: "Mila Chen", byInitials: "MC", timestamp: "4h ago" },
    ],
  },
  {
    id: "c4", workspaceId: "keris", title: "Monthly favorites video", status: "Scheduled", platform: "YouTube", date: "Jul 10",
    author: "Krisztián M.", authorInitials: "KM",
    body: "June favorites: the skincare that finally cleared me up, a book I couldn't put down, and the gadget everyone's been asking about.",
    tags: ["youtube", "monthly-recap"],
    linkedAssets: [],
    comments: [],
    reviewHistory: [],
  },
  {
    id: "c5", workspaceId: "keris", title: "Travel diary thread", status: "Published", platform: "X", date: "Jun 28",
    author: "Ava R.", authorInitials: "AR",
    body: "A thread on the 9 days in Lisbon that changed how I think about slow travel 🧵",
    tags: ["thread", "travel"],
    linkedAssets: [],
    comments: [],
    reviewHistory: [],
  },

  // Buildible — B2B SaaS product
  {
    id: "c6", workspaceId: "buildible", title: "Product update: v2.4 changelog", status: "Scheduled", platform: "LinkedIn", date: "Jul 3",
    author: "Sam K.", authorInitials: "SK",
    body: "v2.4 is live: workspace-level automations, faster CSV exports, and a redesigned settings panel. Full changelog in the comments.",
    tags: ["product", "changelog", "release"],
    linkedAssets: [],
    comments: [],
    reviewHistory: [],
  },
  {
    id: "c7", workspaceId: "buildible", title: "Customer case study: Nova Retail", status: "Needs Review", platform: "LinkedIn", date: "Jul 7",
    author: "Leo D.", authorInitials: "LD",
    body: "How Nova Retail cut their content approval time by 60% using Buildible's workflow automations — full case study.",
    tags: ["case-study", "customer-story"],
    linkedAssets: [{ id: "a6", name: "case-study-nova-retail.pdf", type: "Document" }],
    comments: [
      { id: "cm4", author: "Krisztián Mocanu", authorInitials: "KM", body: "Great write-up — let's get a quote from their VP of Marketing before we publish.", timestamp: "5h ago" },
    ],
    reviewHistory: [
      { id: "rv2", action: "submitted", by: "Leo Dupont", byInitials: "LD", timestamp: "6h ago" },
    ],
  },
  {
    id: "c8", workspaceId: "buildible", title: "Feature demo: automations", status: "Draft", platform: "YouTube", date: "Jul 9",
    author: "Priya N.", authorInitials: "PN",
    body: "3-minute walkthrough of the new automations builder — trigger, condition, action, done.",
    tags: ["demo", "automations", "feature"],
    linkedAssets: [{ id: "a5", name: "product-demo-v2.mp4", type: "Video" }],
    comments: [],
    reviewHistory: [],
  },
  {
    id: "c9", workspaceId: "buildible", title: "Engineering deep dive thread", status: "Published", platform: "X", date: "Jun 30",
    author: "Leo D.", authorInitials: "LD",
    body: "How we rebuilt our webhook delivery system for 10x throughput — a thread on the architecture decisions.",
    tags: ["engineering", "technical"],
    linkedAssets: [],
    comments: [],
    reviewHistory: [],
  },
  {
    id: "c10", workspaceId: "buildible", title: "Integration launch announcement", status: "Scheduled", platform: "LinkedIn", date: "Jul 14",
    author: "Sam K.", authorInitials: "SK",
    body: "Introducing native integrations with the tools you already use — Slack, Notion, and Zapier, live today.",
    tags: ["integration", "launch", "announcement"],
    linkedAssets: [{ id: "a7", name: "logo-lockup-dark.png", type: "Image" }],
    comments: [],
    reviewHistory: [],
  },

  // Personal — intentionally empty to demo the zero-data state
];

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

export function contentForWorkspace(workspaceId: string) {
  return contentItems.filter((item) => item.workspaceId === workspaceId);
}

export function contentById(id: string) {
  return contentItems.find((item) => item.id === id);
}

export function tagsForWorkspace(workspaceId: string): string[] {
  const tags = new Set<string>();
  for (const item of contentForWorkspace(workspaceId)) {
    for (const tag of item.tags) tags.add(tag);
  }
  return Array.from(tags).sort();
}

export type TeamRole =
  | "Owner"
  | "Admin"
  | "Manager"
  | "Editor"
  | "Moderator"
  | "Analyst"
  | "Viewer";

export type DealStatus = "Negotiating" | "In Progress" | "Signed" | "Paid" | "Completed";

export type Deal = {
  id: string;
  workspaceId: string;
  brand: string;
  title: string;
  value: string;
  status: DealStatus;
  dueDate: string;
};

export type RevenueStream = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
};

type WorkspaceMonetization = {
  summary: RevenueStream[];
  deals: Deal[];
};

const emptyMonetization: WorkspaceMonetization = {
  summary: [
    { label: "Total Revenue", value: "$0", change: "—", trend: "up" },
    { label: "Active Deals", value: "0", change: "—", trend: "up" },
  ],
  deals: [],
};

export const monetizationByWorkspace: Record<string, WorkspaceMonetization> = {
  keris: {
    summary: [
      { label: "Total Revenue", value: "$18.4K", change: "+22.0%", trend: "up" },
      { label: "Brand Deals", value: "$12.0K", change: "+30.1%", trend: "up" },
      { label: "Affiliate Earnings", value: "$2.9K", change: "+8.4%", trend: "up" },
      { label: "Memberships", value: "$3.5K", change: "+5.2%", trend: "up" },
    ],
    deals: [
      { id: "d1", workspaceId: "keris", brand: "Glowlux Skincare", title: "Instagram reel package", value: "$4,500", status: "Signed", dueDate: "Jul 15" },
      { id: "d2", workspaceId: "keris", brand: "Trailhead Apparel", title: "TikTok UGC series", value: "$6,000", status: "In Progress", dueDate: "Jul 20" },
      { id: "d3", workspaceId: "keris", brand: "Wanderly Luggage", title: "Story takeover", value: "$1,500", status: "Negotiating", dueDate: "Aug 1" },
      { id: "d4", workspaceId: "keris", brand: "Solstice Sunglasses", title: "YouTube integration", value: "$3,200", status: "Paid", dueDate: "Jun 25" },
    ],
  },
  buildible: {
    summary: [
      { label: "Total Revenue", value: "$15.3K", change: "+12.4%", trend: "up" },
      { label: "Sponsorships", value: "$9.2K", change: "+14.1%", trend: "up" },
      { label: "Referral Revenue", value: "$4.1K", change: "+19.0%", trend: "up" },
      { label: "Webinar Co-sponsors", value: "$2.0K", change: "0.0%", trend: "up" },
    ],
    deals: [
      { id: "d5", workspaceId: "buildible", brand: "DataSync Co", title: "Newsletter sponsorship", value: "$2,500", status: "Signed", dueDate: "Jul 10" },
      { id: "d6", workspaceId: "buildible", brand: "CloudOps Inc", title: "Webinar co-sponsor", value: "$2,000", status: "Completed", dueDate: "Jun 20" },
      { id: "d7", workspaceId: "buildible", brand: "Flowbase", title: "Affiliate partnership", value: "$1,600", status: "In Progress", dueDate: "Jul 25" },
      { id: "d8", workspaceId: "buildible", brand: "PipelineIQ", title: "Case study swap", value: "$0", status: "Negotiating", dueDate: "Aug 5" },
    ],
  },
};

export function monetizationForWorkspace(workspaceId: string): WorkspaceMonetization {
  return monetizationByWorkspace[workspaceId] ?? emptyMonetization;
}
