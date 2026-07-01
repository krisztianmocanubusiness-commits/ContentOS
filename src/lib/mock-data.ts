export type Workspace = {
  id: string;
  name: string;
  plan: "Free" | "Pro" | "Team";
  initials: string;
};

export const workspaces: Workspace[] = [
  { id: "acme", name: "Acme Studio", plan: "Pro", initials: "AS" },
  { id: "northwind", name: "Northwind Media", plan: "Team", initials: "NM" },
  { id: "personal", name: "Personal", plan: "Free", initials: "P" },
];

export const currentUser = {
  name: "Krisztián Mocanu",
  email: "krisztianmocanu.business@gmail.com",
  initials: "KM",
};

export type ContentStatus = "Draft" | "Scheduled" | "Published" | "Needs Review";

export type ContentItem = {
  id: string;
  title: string;
  status: ContentStatus;
  platform: "Instagram" | "TikTok" | "X" | "LinkedIn" | "YouTube";
  date: string;
  author: string;
};

export const contentItems: ContentItem[] = [
  { id: "c1", title: "Q3 product teaser carousel", status: "Scheduled", platform: "Instagram", date: "Jul 3", author: "Krisztián M." },
  { id: "c2", title: "Behind the scenes reel", status: "Draft", platform: "TikTok", date: "Jul 4", author: "Ava R." },
  { id: "c3", title: "Founder thread on roadmap", status: "Needs Review", platform: "X", date: "Jul 5", author: "Sam K." },
  { id: "c4", title: "Case study: 2x retention", status: "Published", platform: "LinkedIn", date: "Jun 29", author: "Ava R." },
  { id: "c5", title: "Tutorial: onboarding flow", status: "Scheduled", platform: "YouTube", date: "Jul 8", author: "Leo D." },
  { id: "c6", title: "Customer spotlight story", status: "Draft", platform: "Instagram", date: "Jul 9", author: "Sam K." },
];

export type CalendarEvent = {
  id: string;
  day: number;
  title: string;
  time: string;
  platform: ContentItem["platform"];
};

export const calendarEvents: CalendarEvent[] = [
  { id: "e1", day: 2, title: "Teaser carousel", time: "9:00 AM", platform: "Instagram" },
  { id: "e2", day: 3, title: "BTS reel", time: "1:00 PM", platform: "TikTok" },
  { id: "e3", day: 5, title: "Founder thread", time: "10:30 AM", platform: "X" },
  { id: "e4", day: 8, title: "Tutorial video", time: "8:00 AM", platform: "YouTube" },
  { id: "e5", day: 12, title: "Customer story", time: "3:00 PM", platform: "Instagram" },
  { id: "e6", day: 18, title: "Roadmap update", time: "11:00 AM", platform: "LinkedIn" },
  { id: "e7", day: 24, title: "Product demo", time: "2:00 PM", platform: "YouTube" },
];

export const analyticsSummary = [
  { label: "Total Reach", value: "482.6K", change: "+12.4%", trend: "up" as const },
  { label: "Engagement Rate", value: "6.8%", change: "+0.6%", trend: "up" as const },
  { label: "New Followers", value: "3,214", change: "+8.1%", trend: "up" as const },
  { label: "Posts Published", value: "42", change: "-3.2%", trend: "down" as const },
];

export const topPosts = [
  { id: "p1", title: "Case study: 2x retention", platform: "LinkedIn", reach: "84.2K", engagement: "9.4%" },
  { id: "p2", title: "Founder thread on roadmap", platform: "X", reach: "61.5K", engagement: "7.1%" },
  { id: "p3", title: "Behind the scenes reel", platform: "TikTok", reach: "112.9K", engagement: "11.2%" },
];

export type Asset = {
  id: string;
  name: string;
  type: "Image" | "Video" | "Audio" | "Document";
  size: string;
  date: string;
  usedIn: number;
};

export const assets: Asset[] = [
  { id: "a1", name: "brand-logo-white.png", type: "Image", size: "212 KB", date: "Jun 20", usedIn: 8 },
  { id: "a2", name: "product-launch-final.mp4", type: "Video", size: "84.1 MB", date: "Jun 24", usedIn: 3 },
  { id: "a3", name: "voiceover-intro.wav", type: "Audio", size: "6.4 MB", date: "Jun 26", usedIn: 1 },
  { id: "a4", name: "q3-brand-guidelines.pdf", type: "Document", size: "1.2 MB", date: "Jun 27", usedIn: 5 },
  { id: "a5", name: "founder-headshot.jpg", type: "Image", size: "1.8 MB", date: "Jun 29", usedIn: 12 },
  { id: "a6", name: "tutorial-b-roll.mp4", type: "Video", size: "142 MB", date: "Jul 1", usedIn: 2 },
];

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
  { id: "t2", name: "Ava Reyes", email: "ava@acmestudio.com", role: "Admin", status: "Active", initials: "AR" },
  { id: "t3", name: "Sam Kim", email: "sam@acmestudio.com", role: "Editor", status: "Active", initials: "SK" },
  { id: "t4", name: "Leo Dupont", email: "leo@acmestudio.com", role: "Editor", status: "Invited", initials: "LD" },
  { id: "t5", name: "Priya Nair", email: "priya@acmestudio.com", role: "Viewer", status: "Active", initials: "PN" },
];
