import type { ContentStatus, DealStatus } from "@/lib/mock-data";

export function statusVariant(
  status: ContentStatus
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (status) {
    case "Published":
      return "success";
    case "Scheduled":
      return "default";
    case "Needs Review":
      return "warning";
    case "Draft":
    default:
      return "secondary";
  }
}

/** Raw bar-fill colors matching statusVariant's semantics, for charts that can't use the Badge component. */
export const statusBarColor: Record<ContentStatus, string> = {
  Draft: "bg-muted-foreground/50",
  "Needs Review": "bg-warning",
  Scheduled: "bg-primary",
  Published: "bg-success",
};

export function dealStatusVariant(
  status: DealStatus
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (status) {
    case "Paid":
    case "Completed":
      return "success";
    case "Signed":
      return "default";
    case "In Progress":
      return "warning";
    case "Negotiating":
    default:
      return "outline";
  }
}
