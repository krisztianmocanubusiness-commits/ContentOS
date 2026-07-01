export type Workspace = {
  id: string;
  name: string;
  plan: "Free" | "Pro" | "Team";
  initials: string;
};

// Seed workspaces. Each represents a brand/page — Keris is a personal
// creator brand, Buildible is a B2B SaaS product, Personal is an empty
// workspace used to demo the zero-data state.
export const workspaces: Workspace[] = [
  { id: "keris", name: "Keris", plan: "Pro", initials: "KE" },
  { id: "buildible", name: "Buildible", plan: "Team", initials: "BU" },
  { id: "personal", name: "Personal", plan: "Free", initials: "P" },
];

export const currentUser = {
  name: "Krisztián Mocanu",
  email: "krisztianmocanu.business@gmail.com",
  initials: "KM",
};

export type Platform = "Instagram" | "TikTok" | "X" | "LinkedIn" | "YouTube";

export type ContentStatus = "Draft" | "Scheduled" | "Published" | "Needs Review";

export type ContentItem = {
  id: string;
  workspaceId: string;
  title: string;
  status: ContentStatus;
  platform: Platform;
  date: string;
  author: string;
};

export const contentItems: ContentItem[] = [
  // Keris — personal creator brand
  { id: "c1", workspaceId: "keris", title: "Morning routine reel", status: "Scheduled", platform: "TikTok", date: "Jul 3", author: "Krisztián M." },
  { id: "c2", workspaceId: "keris", title: "Outfit try-on carousel", status: "Draft", platform: "Instagram", date: "Jul 4", author: "Ava R." },
  { id: "c3", workspaceId: "keris", title: "Q&A Instagram Live recap", status: "Needs Review", platform: "Instagram", date: "Jul 6", author: "Sam K." },
  { id: "c4", workspaceId: "keris", title: "Monthly favorites video", status: "Scheduled", platform: "YouTube", date: "Jul 10", author: "Krisztián M." },
  { id: "c5", workspaceId: "keris", title: "Travel diary thread", status: "Published", platform: "X", date: "Jun 28", author: "Ava R." },

  // Buildible — B2B SaaS product
  { id: "c6", workspaceId: "buildible", title: "Product update: v2.4 changelog", status: "Scheduled", platform: "LinkedIn", date: "Jul 3", author: "Sam K." },
  { id: "c7", workspaceId: "buildible", title: "Customer case study: Nova Retail", status: "Needs Review", platform: "LinkedIn", date: "Jul 7", author: "Leo D." },
  { id: "c8", workspaceId: "buildible", title: "Feature demo: automations", status: "Draft", platform: "YouTube", date: "Jul 9", author: "Priya N." },
  { id: "c9", workspaceId: "buildible", title: "Engineering deep dive thread", status: "Published", platform: "X", date: "Jun 30", author: "Leo D." },
  { id: "c10", workspaceId: "buildible", title: "Integration launch announcement", status: "Scheduled", platform: "LinkedIn", date: "Jul 14", author: "Sam K." },

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

export const calendarEvents: CalendarEvent[] = [
  { id: "e1", workspaceId: "keris", date: "2026-07-01", time: "7:30 AM", title: "Coffee run vlog", platform: "Instagram" },
  { id: "e2", workspaceId: "keris", date: "2026-07-03", time: "9:00 AM", title: "Morning routine reel", platform: "TikTok" },
  { id: "e3", workspaceId: "keris", date: "2026-07-04", time: "1:00 PM", title: "Outfit try-on carousel", platform: "Instagram" },
  { id: "e4", workspaceId: "keris", date: "2026-07-06", time: "10:30 AM", title: "Live Q&A recap", platform: "Instagram" },
  { id: "e5", workspaceId: "keris", date: "2026-07-10", time: "8:00 AM", title: "Monthly favorites", platform: "YouTube" },
  { id: "e6", workspaceId: "keris", date: "2026-07-18", time: "11:00 AM", title: "Summer lookbook", platform: "Instagram" },
  { id: "e7", workspaceId: "keris", date: "2026-07-24", time: "2:00 PM", title: "Studio tour vlog", platform: "YouTube" },

  { id: "e8", workspaceId: "buildible", date: "2026-07-01", time: "9:00 AM", title: "Weekly standup recap", platform: "X" },
  { id: "e9", workspaceId: "buildible", date: "2026-07-03", time: "9:00 AM", title: "v2.4 changelog", platform: "LinkedIn" },
  { id: "e10", workspaceId: "buildible", date: "2026-07-07", time: "1:00 PM", title: "Nova Retail case study", platform: "LinkedIn" },
  { id: "e11", workspaceId: "buildible", date: "2026-07-09", time: "10:00 AM", title: "Automations demo", platform: "YouTube" },
  { id: "e12", workspaceId: "buildible", date: "2026-07-14", time: "8:30 AM", title: "Integration launch", platform: "LinkedIn" },
  { id: "e13", workspaceId: "buildible", date: "2026-07-22", time: "3:00 PM", title: "Roadmap AMA", platform: "X" },
];

export type AnalyticsStat = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
};

export type TopPost = {
  id: string;
  title: string;
  platform: Platform;
  reach: string;
  engagement: string;
};

type WorkspaceAnalytics = {
  summary: AnalyticsStat[];
  topPosts: TopPost[];
  chart: number[];
};

const emptyAnalytics: WorkspaceAnalytics = {
  summary: [
    { label: "Total Reach", value: "0", change: "—", trend: "up" },
    { label: "Engagement Rate", value: "0%", change: "—", trend: "up" },
    { label: "New Followers", value: "0", change: "—", trend: "up" },
    { label: "Posts Published", value: "0", change: "—", trend: "up" },
  ],
  topPosts: [],
  chart: Array(12).fill(0),
};

export const analyticsByWorkspace: Record<string, WorkspaceAnalytics> = {
  keris: {
    summary: [
      { label: "Total Reach", value: "612.4K", change: "+18.2%", trend: "up" },
      { label: "Engagement Rate", value: "8.1%", change: "+1.1%", trend: "up" },
      { label: "New Followers", value: "5,120", change: "+9.4%", trend: "up" },
      { label: "Posts Published", value: "28", change: "+4.0%", trend: "up" },
    ],
    topPosts: [
      { id: "p1", title: "Travel diary thread", platform: "X", reach: "142.8K", engagement: "12.6%" },
      { id: "p2", title: "Monthly favorites video", platform: "YouTube", reach: "98.3K", engagement: "9.8%" },
      { id: "p3", title: "Morning routine reel", platform: "TikTok", reach: "204.5K", engagement: "14.1%" },
    ],
    chart: [48, 52, 58, 55, 63, 68, 71, 75, 80, 86, 91, 97],
  },
  buildible: {
    summary: [
      { label: "Total Reach", value: "94.8K", change: "+6.3%", trend: "up" },
      { label: "Engagement Rate", value: "4.2%", change: "-0.4%", trend: "down" },
      { label: "New Followers", value: "812", change: "+2.1%", trend: "up" },
      { label: "Posts Published", value: "15", change: "-1.8%", trend: "down" },
    ],
    topPosts: [
      { id: "p4", title: "Customer case study: Nova Retail", platform: "LinkedIn", reach: "31.2K", engagement: "6.9%" },
      { id: "p5", title: "Engineering deep dive thread", platform: "X", reach: "22.6K", engagement: "5.4%" },
      { id: "p6", title: "Feature demo: automations", platform: "YouTube", reach: "18.9K", engagement: "7.2%" },
    ],
    chart: [35, 40, 38, 44, 41, 46, 43, 49, 45, 52, 48, 55],
  },
};

export function analyticsForWorkspace(workspaceId: string): WorkspaceAnalytics {
  return analyticsByWorkspace[workspaceId] ?? emptyAnalytics;
}

export type Asset = {
  id: string;
  workspaceId: string;
  name: string;
  type: "Image" | "Video" | "Audio" | "Document";
  size: string;
  date: string;
  usedIn: number;
};

export const assets: Asset[] = [
  { id: "a1", workspaceId: "keris", name: "morning-routine-final.mp4", type: "Video", size: "96.2 MB", date: "Jun 28", usedIn: 2 },
  { id: "a2", workspaceId: "keris", name: "brand-moodboard.png", type: "Image", size: "3.1 MB", date: "Jun 29", usedIn: 6 },
  { id: "a3", workspaceId: "keris", name: "podcast-intro.wav", type: "Audio", size: "4.8 MB", date: "Jun 30", usedIn: 1 },
  { id: "a4", workspaceId: "keris", name: "media-kit-2026.pdf", type: "Document", size: "2.4 MB", date: "Jul 1", usedIn: 3 },

  { id: "a5", workspaceId: "buildible", name: "product-demo-v2.mp4", type: "Video", size: "118 MB", date: "Jun 27", usedIn: 4 },
  { id: "a6", workspaceId: "buildible", name: "case-study-nova-retail.pdf", type: "Document", size: "1.6 MB", date: "Jun 29", usedIn: 2 },
  { id: "a7", workspaceId: "buildible", name: "logo-lockup-dark.png", type: "Image", size: "340 KB", date: "Jun 30", usedIn: 9 },
  { id: "a8", workspaceId: "buildible", name: "founder-interview.wav", type: "Audio", size: "8.2 MB", date: "Jul 1", usedIn: 1 },

  // Personal — intentionally empty
];

export type SocialAccount = {
  id: string;
  workspaceId: string;
  platform: Platform;
  handle: string;
  followers: string;
  status: "Connected" | "Not Connected";
};

export const socialAccounts: SocialAccount[] = [
  { id: "s1", workspaceId: "keris", platform: "Instagram", handle: "@keris", followers: "212K", status: "Connected" },
  { id: "s2", workspaceId: "keris", platform: "TikTok", handle: "@keris", followers: "340K", status: "Connected" },
  { id: "s3", workspaceId: "keris", platform: "YouTube", handle: "Keris", followers: "58K", status: "Connected" },
  { id: "s4", workspaceId: "keris", platform: "X", handle: "@keris", followers: "12K", status: "Not Connected" },

  { id: "s5", workspaceId: "buildible", platform: "LinkedIn", handle: "Buildible", followers: "8.4K", status: "Connected" },
  { id: "s6", workspaceId: "buildible", platform: "X", handle: "@buildible", followers: "5.1K", status: "Connected" },
  { id: "s7", workspaceId: "buildible", platform: "YouTube", handle: "Buildible", followers: "2.3K", status: "Not Connected" },

  // Personal — intentionally empty
];

export function contentForWorkspace(workspaceId: string) {
  return contentItems.filter((item) => item.workspaceId === workspaceId);
}

export function calendarEventsForWorkspace(workspaceId: string) {
  return calendarEvents.filter((event) => event.workspaceId === workspaceId);
}

export function assetsForWorkspace(workspaceId: string) {
  return assets.filter((asset) => asset.workspaceId === workspaceId);
}

export function socialAccountsForWorkspace(workspaceId: string) {
  return socialAccounts.filter((account) => account.workspaceId === workspaceId);
}

// Team members are shared across the whole account, not scoped per
// workspace/brand.
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Editor" | "Viewer";
  status: "Active" | "Invited";
  initials: string;
};

export const teamMembers: TeamMember[] = [
  { id: "t1", name: "Krisztián Mocanu", email: "krisztianmocanu.business@gmail.com", role: "Owner", status: "Active", initials: "KM" },
  { id: "t2", name: "Ava Reyes", email: "ava@keris.co", role: "Admin", status: "Active", initials: "AR" },
  { id: "t3", name: "Sam Kim", email: "sam@buildible.com", role: "Editor", status: "Active", initials: "SK" },
  { id: "t4", name: "Leo Dupont", email: "leo@buildible.com", role: "Editor", status: "Invited", initials: "LD" },
  { id: "t5", name: "Priya Nair", email: "priya@buildible.com", role: "Viewer", status: "Active", initials: "PN" },
];
