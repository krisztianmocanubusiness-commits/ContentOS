/**
 * Plain, client-safe module — no "server-only", no Prisma imports — so
 * client components (filter controls, badges, the entry form) can share
 * these unions with the server-only monetization-data/actions modules
 * without pulling Prisma into the client bundle. Mirrors
 * social-account-types.ts / inbox-types.ts.
 */
export type MonetizationType = "Income" | "Expense";

export type MonetizationCategory =
  | "Sponsorship"
  | "Affiliate"
  | "PlatformRevenue"
  | "Merchandise"
  | "DigitalProduct"
  | "OtherIncome"
  | "Expense";

export const MONETIZATION_CATEGORY_LABEL: Record<MonetizationCategory, string> = {
  Sponsorship: "Sponsorship",
  Affiliate: "Affiliate",
  PlatformRevenue: "Platform Revenue",
  Merchandise: "Merchandise",
  DigitalProduct: "Digital Product",
  OtherIncome: "Other Income",
  Expense: "Expense",
};

/** Every category maps onto exactly one type — Expense is the only non-income value. */
export const CATEGORY_TYPE: Record<MonetizationCategory, MonetizationType> = {
  Sponsorship: "Income",
  Affiliate: "Income",
  PlatformRevenue: "Income",
  Merchandise: "Income",
  DigitalProduct: "Income",
  OtherIncome: "Income",
  Expense: "Expense",
};

export const INCOME_CATEGORIES: MonetizationCategory[] = [
  "Sponsorship",
  "Affiliate",
  "PlatformRevenue",
  "Merchandise",
  "DigitalProduct",
  "OtherIncome",
];

export const ALL_CATEGORIES: MonetizationCategory[] = [...INCOME_CATEGORIES, "Expense"];

export type MonetizationStatus = "Negotiating" | "InProgress" | "Pending" | "Paid" | "Cancelled";

export const MONETIZATION_STATUS_LABEL: Record<MonetizationStatus, string> = {
  Negotiating: "Negotiating",
  InProgress: "In Progress",
  Pending: "Pending",
  Paid: "Paid",
  Cancelled: "Cancelled",
};

export const MONETIZATION_STATUSES: MonetizationStatus[] = [
  "Negotiating",
  "InProgress",
  "Pending",
  "Paid",
  "Cancelled",
];

/** Statuses that still count as outstanding/expected revenue, not yet realized. */
export const OPEN_STATUSES: MonetizationStatus[] = ["Negotiating", "InProgress", "Pending"];

export type MonetizationProvider = "Manual" | "YouTube" | "TikTok" | "Patreon" | "Stripe" | "LemonSqueezy";

export const MONETIZATION_PROVIDER_LABEL: Record<MonetizationProvider, string> = {
  Manual: "Manual",
  YouTube: "YouTube",
  TikTok: "TikTok",
  Patreon: "Patreon",
  Stripe: "Stripe",
  LemonSqueezy: "Lemon Squeezy",
};

/**
 * A small curated list, not a DB enum — see MonetizationEntry.currency in
 * schema.prisma. Extending this list is a plain code change, never a
 * migration.
 */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Derived, not stored — a Pending/Negotiating/InProgress entry whose dueDate has passed. */
export function isOverdue(status: MonetizationStatus, dueDate: Date | string | null, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  if (!OPEN_STATUSES.includes(status)) return false;
  return new Date(dueDate).getTime() < now.getTime();
}
