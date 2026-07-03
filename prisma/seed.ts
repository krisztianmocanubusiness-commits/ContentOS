import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

const YEAR = 2026;
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** "Jul 3" -> 2026-07-03. */
function shortDate(label: string): Date {
  const [month, day] = label.split(" ");
  return new Date(YEAR, MONTHS[month], Number(day));
}

/** "7:30 AM" combined with a date-only Date. */
function withTime(date: Date, time: string): Date {
  const [clock, meridiem] = time.split(" ");
  const [hourStr, minuteStr] = clock.split(":");
  let hour = Number(hourStr) % 12;
  if (meridiem === "PM") hour += 12;
  const result = new Date(date);
  result.setHours(hour, Number(minuteStr), 0, 0);
  return result;
}

/** "Jan 2024" -> first of that month. */
function monthYear(label: string): Date {
  const [month, year] = label.split(" ");
  return new Date(Number(year), MONTHS[month], 1);
}

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000);
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

async function passwordHash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const placeholderPassword = await passwordHash("contentos-teammate");

  const users = [
    { id: "u-krisztian", name: "Krisztián Mocanu", email: "krisztianmocanu.business@gmail.com", initials: "KM", passwordHash: await passwordHash("contentos123") },
    { id: "u-ava", name: "Ava Reyes", email: "ava@keris.co", initials: "AR", passwordHash: placeholderPassword },
    { id: "u-mila", name: "Mila Chen", email: "mila@keris.co", initials: "MC", passwordHash: placeholderPassword },
    { id: "u-sam", name: "Sam Kim", email: "sam@buildible.com", initials: "SK", passwordHash: placeholderPassword },
    { id: "u-leo", name: "Leo Dupont", email: "leo@buildible.com", initials: "LD", passwordHash: placeholderPassword },
    { id: "u-priya", name: "Priya Nair", email: "priya@buildible.com", initials: "PN", passwordHash: placeholderPassword },
  ];
  for (const user of users) {
    await prisma.user.upsert({ where: { id: user.id }, update: user, create: user });
  }

  const workspaces = [
    { id: "keris", name: "Keris", slug: "keris", plan: "Pro" as const, initials: "KE" },
    { id: "buildible", name: "Buildible", slug: "buildible", plan: "Team" as const, initials: "BU" },
    { id: "personal", name: "Personal", slug: "personal", plan: "Free" as const, initials: "P" },
  ];
  for (const workspace of workspaces) {
    await prisma.workspace.upsert({ where: { id: workspace.id }, update: workspace, create: workspace });
  }

  const memberships = [
    { id: "t1", userId: "u-krisztian", workspaceId: "keris", role: "Owner" as const, status: "Active" as const },
    { id: "t2", userId: "u-ava", workspaceId: "keris", role: "Admin" as const, status: "Active" as const },
    { id: "t3", userId: "u-mila", workspaceId: "keris", role: "Editor" as const, status: "Active" as const },
    { id: "t4", userId: "u-krisztian", workspaceId: "buildible", role: "Owner" as const, status: "Active" as const },
    { id: "t5", userId: "u-sam", workspaceId: "buildible", role: "Editor" as const, status: "Active" as const },
    { id: "t6", userId: "u-leo", workspaceId: "buildible", role: "Editor" as const, status: "Invited" as const },
    { id: "t7", userId: "u-priya", workspaceId: "buildible", role: "Viewer" as const, status: "Active" as const },
    { id: "t8", userId: "u-krisztian", workspaceId: "personal", role: "Owner" as const, status: "Active" as const },
  ];
  for (const membership of memberships) {
    await prisma.workspaceMembership.upsert({ where: { id: membership.id }, update: membership, create: membership });
  }

  const assets = [
    { id: "a1", workspaceId: "keris", name: "morning-routine-final.mp4", type: "Video" as const, sizeLabel: "96.2 MB", date: "Jun 28", folder: "Reels & Videos", tags: ["morning-routine", "reel"] },
    { id: "a2", workspaceId: "keris", name: "brand-moodboard.png", type: "Image" as const, sizeLabel: "3.1 MB", date: "Jun 29", folder: "Brand Assets", tags: ["moodboard", "branding"] },
    { id: "a3", workspaceId: "keris", name: "podcast-intro.wav", type: "Audio" as const, sizeLabel: "4.8 MB", date: "Jun 30", folder: "Podcast", tags: ["podcast", "intro"] },
    { id: "a4", workspaceId: "keris", name: "media-kit-2026.pdf", type: "Document" as const, sizeLabel: "2.4 MB", date: "Jul 1", folder: "Press Kit", tags: ["press", "media-kit"] },
    { id: "a5", workspaceId: "buildible", name: "product-demo-v2.mp4", type: "Video" as const, sizeLabel: "118 MB", date: "Jun 27", folder: "Product Demos", tags: ["demo", "automations"] },
    { id: "a6", workspaceId: "buildible", name: "case-study-nova-retail.pdf", type: "Document" as const, sizeLabel: "1.6 MB", date: "Jun 29", folder: "Case Studies", tags: ["case-study", "nova-retail"] },
    { id: "a7", workspaceId: "buildible", name: "logo-lockup-dark.png", type: "Image" as const, sizeLabel: "340 KB", date: "Jun 30", folder: "Brand Assets", tags: ["logo", "branding"] },
    { id: "a8", workspaceId: "buildible", name: "founder-interview.wav", type: "Audio" as const, sizeLabel: "8.2 MB", date: "Jul 1", folder: "Interviews", tags: ["interview", "founder"] },
  ];
  for (const { date, ...asset } of assets) {
    await prisma.asset.upsert({
      where: { id: asset.id },
      update: { ...asset, createdAt: shortDate(date) },
      create: { ...asset, createdAt: shortDate(date) },
    });
  }

  const content = [
    { id: "c1", workspaceId: "keris", title: "Morning routine reel", status: "Scheduled" as const, platform: "TikTok" as const, date: "Jul 3", authorName: "Krisztián M.", authorInitials: "KM", body: "POV: 5am alarm hits and you still choose the sunrise walk. Full routine — cold plunge, journaling, matcha — link in bio for the journal I use.", tags: ["reel", "morning-routine", "lifestyle"], assetIds: ["a1"] },
    { id: "c2", workspaceId: "keris", title: "Outfit try-on carousel", status: "Draft" as const, platform: "Instagram" as const, date: "Jul 4", authorName: "Ava R.", authorInitials: "AR", body: "5 ways to style one blazer for fall. Swipe for the thrifted vs. new breakdown 👗", tags: ["ootd", "carousel", "fashion"], assetIds: [] },
    { id: "c3", workspaceId: "keris", title: "Q&A Instagram Live recap", status: "NeedsReview" as const, platform: "Instagram" as const, date: "Jul 6", authorName: "Mila Chen", authorInitials: "MC", body: "Recap carousel from last night's Live — answering your top 10 questions about the skincare routine, the move, and what's next for the podcast.", tags: ["live", "qna", "community"], assetIds: [] },
    { id: "c4", workspaceId: "keris", title: "Monthly favorites video", status: "Scheduled" as const, platform: "YouTube" as const, date: "Jul 10", authorName: "Krisztián M.", authorInitials: "KM", body: "June favorites: the skincare that finally cleared me up, a book I couldn't put down, and the gadget everyone's been asking about.", tags: ["youtube", "monthly-recap"], assetIds: [] },
    { id: "c5", workspaceId: "keris", title: "Travel diary thread", status: "Published" as const, platform: "X" as const, date: "Jun 28", authorName: "Ava R.", authorInitials: "AR", body: "A thread on the 9 days in Lisbon that changed how I think about slow travel 🧵", tags: ["thread", "travel"], assetIds: [] },
    { id: "c6", workspaceId: "buildible", title: "Product update: v2.4 changelog", status: "Scheduled" as const, platform: "LinkedIn" as const, date: "Jul 3", authorName: "Sam K.", authorInitials: "SK", body: "v2.4 is live: workspace-level automations, faster CSV exports, and a redesigned settings panel. Full changelog in the comments.", tags: ["product", "changelog", "release"], assetIds: [] },
    { id: "c7", workspaceId: "buildible", title: "Customer case study: Nova Retail", status: "NeedsReview" as const, platform: "LinkedIn" as const, date: "Jul 7", authorName: "Leo D.", authorInitials: "LD", body: "How Nova Retail cut their content approval time by 60% using Buildible's workflow automations — full case study.", tags: ["case-study", "customer-story"], assetIds: ["a6"] },
    { id: "c8", workspaceId: "buildible", title: "Feature demo: automations", status: "Draft" as const, platform: "YouTube" as const, date: "Jul 9", authorName: "Priya N.", authorInitials: "PN", body: "3-minute walkthrough of the new automations builder — trigger, condition, action, done.", tags: ["demo", "automations", "feature"], assetIds: ["a5"] },
    { id: "c9", workspaceId: "buildible", title: "Engineering deep dive thread", status: "Published" as const, platform: "X" as const, date: "Jun 30", authorName: "Leo D.", authorInitials: "LD", body: "How we rebuilt our webhook delivery system for 10x throughput — a thread on the architecture decisions.", tags: ["engineering", "technical"], assetIds: [] },
    { id: "c10", workspaceId: "buildible", title: "Integration launch announcement", status: "Scheduled" as const, platform: "LinkedIn" as const, date: "Jul 14", authorName: "Sam K.", authorInitials: "SK", body: "Introducing native integrations with the tools you already use — Slack, Notion, and Zapier, live today.", tags: ["integration", "launch", "announcement"], assetIds: ["a7"] },
  ];
  for (const { date, assetIds, ...item } of content) {
    await prisma.contentItem.upsert({
      where: { id: item.id },
      update: { ...item, scheduledAt: shortDate(date), assets: { set: assetIds.map((id) => ({ id })) } },
      create: { ...item, scheduledAt: shortDate(date), assets: { connect: assetIds.map((id) => ({ id })) } },
    });
  }

  const comments = [
    { id: "cm1", contentItemId: "c2", author: "Ava Reyes", authorInitials: "AR", body: "Can we get the studio shots re-edited with warmer tones before this goes out?", createdAt: daysAgo(1) },
    { id: "cm2", contentItemId: "c3", author: "Krisztián Mocanu", authorInitials: "KM", body: "Love this — can we swap slide 4 to lead with the podcast announcement instead?", createdAt: hoursAgo(3) },
    { id: "cm3", contentItemId: "c3", author: "Mila Chen", authorInitials: "MC", body: "Good call, updating now.", createdAt: hoursAgo(2) },
    { id: "cm4", contentItemId: "c7", author: "Krisztián Mocanu", authorInitials: "KM", body: "Great write-up — let's get a quote from their VP of Marketing before we publish.", createdAt: hoursAgo(5) },
  ];
  for (const comment of comments) {
    await prisma.contentComment.upsert({ where: { id: comment.id }, update: comment, create: comment });
  }

  const reviewEvents = [
    { id: "rv1", contentItemId: "c3", action: "submitted" as const, byName: "Mila Chen", byInitials: "MC", createdAt: hoursAgo(4) },
    { id: "rv2", contentItemId: "c7", action: "submitted" as const, byName: "Leo Dupont", byInitials: "LD", createdAt: hoursAgo(6) },
  ];
  for (const event of reviewEvents) {
    await prisma.reviewEvent.upsert({ where: { id: event.id }, update: event, create: event });
  }

  const calendarEvents = [
    { id: "e1", workspaceId: "keris", date: "2026-07-01", time: "7:30 AM", title: "Coffee run vlog", platform: "Instagram" as const },
    { id: "e2", workspaceId: "keris", date: "2026-07-03", time: "9:00 AM", title: "Morning routine reel", platform: "TikTok" as const },
    { id: "e3", workspaceId: "keris", date: "2026-07-04", time: "1:00 PM", title: "Outfit try-on carousel", platform: "Instagram" as const },
    { id: "e4", workspaceId: "keris", date: "2026-07-06", time: "10:30 AM", title: "Live Q&A recap", platform: "Instagram" as const },
    { id: "e5", workspaceId: "keris", date: "2026-07-10", time: "8:00 AM", title: "Monthly favorites", platform: "YouTube" as const },
    { id: "e6", workspaceId: "keris", date: "2026-07-18", time: "11:00 AM", title: "Summer lookbook", platform: "Instagram" as const },
    { id: "e7", workspaceId: "keris", date: "2026-07-24", time: "2:00 PM", title: "Studio tour vlog", platform: "YouTube" as const },
    { id: "e8", workspaceId: "buildible", date: "2026-07-01", time: "9:00 AM", title: "Weekly standup recap", platform: "X" as const },
    { id: "e9", workspaceId: "buildible", date: "2026-07-03", time: "9:00 AM", title: "v2.4 changelog", platform: "LinkedIn" as const },
    { id: "e10", workspaceId: "buildible", date: "2026-07-07", time: "1:00 PM", title: "Nova Retail case study", platform: "LinkedIn" as const },
    { id: "e11", workspaceId: "buildible", date: "2026-07-09", time: "10:00 AM", title: "Automations demo", platform: "YouTube" as const },
    { id: "e12", workspaceId: "buildible", date: "2026-07-14", time: "8:30 AM", title: "Integration launch", platform: "LinkedIn" as const },
    { id: "e13", workspaceId: "buildible", date: "2026-07-22", time: "3:00 PM", title: "Roadmap AMA", platform: "X" as const },
  ];
  for (const { date, time, ...event } of calendarEvents) {
    const scheduledAt = withTime(new Date(date), time);
    await prisma.calendarEvent.upsert({
      where: { id: event.id },
      update: { ...event, scheduledAt },
      create: { ...event, scheduledAt },
    });
  }

  const socialAccounts = [
    { id: "s1", workspaceId: "keris", platform: "Instagram" as const, handle: "@keris", followersLabel: "212K", status: "Connected" as const, connectedSince: monthYear("Jan 2024"), lastSyncedAt: hoursAgo(2) },
    { id: "s2", workspaceId: "keris", platform: "TikTok" as const, handle: "@keris", followersLabel: "340K", status: "Connected" as const, connectedSince: monthYear("Mar 2024"), lastSyncedAt: hoursAgo(1) },
    { id: "s3", workspaceId: "keris", platform: "YouTube" as const, handle: "Keris", followersLabel: "58K", status: "Connected" as const, connectedSince: monthYear("Aug 2023"), lastSyncedAt: hoursAgo(5) },
    { id: "s4", workspaceId: "keris", platform: "X" as const, handle: "@keris", followersLabel: "12K", status: "NotConnected" as const, connectedSince: null, lastSyncedAt: null },
    { id: "s5", workspaceId: "buildible", platform: "LinkedIn" as const, handle: "Buildible", followersLabel: "8.4K", status: "Connected" as const, connectedSince: monthYear("Feb 2025"), lastSyncedAt: hoursAgo(3) },
    { id: "s6", workspaceId: "buildible", platform: "X" as const, handle: "@buildible", followersLabel: "5.1K", status: "Connected" as const, connectedSince: monthYear("Feb 2025"), lastSyncedAt: hoursAgo(6) },
    { id: "s7", workspaceId: "buildible", platform: "YouTube" as const, handle: "Buildible", followersLabel: "2.3K", status: "NotConnected" as const, connectedSince: null, lastSyncedAt: null },
  ];
  for (const account of socialAccounts) {
    await prisma.socialAccount.upsert({ where: { id: account.id }, update: account, create: account });
  }

  const conversations = [
    { id: "conv1", workspaceId: "keris", platform: "Instagram" as const, contactName: "Sophie Marlowe", contactHandle: "@sophie.creates", contactInitials: "SM", unread: true },
    { id: "conv2", workspaceId: "keris", platform: "Instagram" as const, contactName: "Glowlux Skincare", contactHandle: "@glowlux", contactInitials: "GL", unread: true },
    { id: "conv3", workspaceId: "keris", platform: "TikTok" as const, contactName: "Jordan Wells", contactHandle: "@jordanw", contactInitials: "JW", unread: false },
    { id: "conv4", workspaceId: "buildible", platform: "LinkedIn" as const, contactName: "Jordan Lee", contactHandle: "Jordan Lee", contactInitials: "JL", unread: true },
    { id: "conv5", workspaceId: "buildible", platform: "X" as const, contactName: "Dev Fan", contactHandle: "@devfan22", contactInitials: "DF", unread: false },
    { id: "conv6", workspaceId: "buildible", platform: "LinkedIn" as const, contactName: "Nova Retail Team", contactHandle: "Nova Retail", contactInitials: "NR", unread: false },
  ];
  for (const conversation of conversations) {
    await prisma.conversation.upsert({ where: { id: conversation.id }, update: conversation, create: conversation });
  }

  const messages = [
    { id: "m1", conversationId: "conv1", from: "them" as const, body: "Loved your last reel! Where's that jacket from?", createdAt: hoursAgo(2) },
    { id: "m2", conversationId: "conv2", from: "them" as const, body: "Hi Keris! We'd love to collaborate on a reel package for our new serum launch.", createdAt: hoursAgo(6) },
    { id: "m3", conversationId: "conv2", from: "you" as const, body: "Hi! Thanks for reaching out — send over the brief and I'll take a look.", createdAt: hoursAgo(5) },
    { id: "m4", conversationId: "conv3", from: "them" as const, body: "Your morning routine reel is my new favorite 🔥", createdAt: daysAgo(1) },
    { id: "m5", conversationId: "conv3", from: "you" as const, body: "Thank you so much!! 💛", createdAt: daysAgo(1) },
    { id: "m6", conversationId: "conv4", from: "them" as const, body: "Is there an enterprise plan with SSO? We're evaluating for a 200-seat rollout.", createdAt: hoursAgo(1) },
    { id: "m7", conversationId: "conv5", from: "them" as const, body: "Great changelog post — when's the webhook feature landing?", createdAt: hoursAgo(5) },
    { id: "m8", conversationId: "conv5", from: "you" as const, body: "Targeting next sprint, should ship within 2 weeks!", createdAt: hoursAgo(4) },
    { id: "m9", conversationId: "conv6", from: "them" as const, body: "Thanks for featuring us in the case study, it's already driving traffic our way!", createdAt: daysAgo(2) },
  ];
  for (const message of messages) {
    await prisma.inboxMessage.upsert({ where: { id: message.id }, update: message, create: message });
  }

  const deals = [
    { id: "d1", workspaceId: "keris", brand: "Glowlux Skincare", title: "Instagram reel package", valueLabel: "$4,500", status: "Signed" as const, dueDate: "Jul 15" },
    { id: "d2", workspaceId: "keris", brand: "Trailhead Apparel", title: "TikTok UGC series", valueLabel: "$6,000", status: "InProgress" as const, dueDate: "Jul 20" },
    { id: "d3", workspaceId: "keris", brand: "Wanderly Luggage", title: "Story takeover", valueLabel: "$1,500", status: "Negotiating" as const, dueDate: "Aug 1" },
    { id: "d4", workspaceId: "keris", brand: "Solstice Sunglasses", title: "YouTube integration", valueLabel: "$3,200", status: "Paid" as const, dueDate: "Jun 25" },
    { id: "d5", workspaceId: "buildible", brand: "DataSync Co", title: "Newsletter sponsorship", valueLabel: "$2,500", status: "Signed" as const, dueDate: "Jul 10" },
    { id: "d6", workspaceId: "buildible", brand: "CloudOps Inc", title: "Webinar co-sponsor", valueLabel: "$2,000", status: "Completed" as const, dueDate: "Jun 20" },
    { id: "d7", workspaceId: "buildible", brand: "Flowbase", title: "Affiliate partnership", valueLabel: "$1,600", status: "InProgress" as const, dueDate: "Jul 25" },
    { id: "d8", workspaceId: "buildible", brand: "PipelineIQ", title: "Case study swap", valueLabel: "$0", status: "Negotiating" as const, dueDate: "Aug 5" },
  ];
  for (const { dueDate, ...deal } of deals) {
    await prisma.deal.upsert({
      where: { id: deal.id },
      update: { ...deal, dueDate: shortDate(dueDate) },
      create: { ...deal, dueDate: shortDate(dueDate) },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
