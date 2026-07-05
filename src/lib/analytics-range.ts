/**
 * Plain, client-safe module — no "server-only", no Prisma imports — so
 * both the client-side range selector and the server-only analytics
 * data service can share the same AnalyticsRange type/options without
 * the client bundling analytics-data.ts's Prisma-dependent code.
 */
export type AnalyticsRange = "7d" | "30d" | "90d";

export const ANALYTICS_RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];
