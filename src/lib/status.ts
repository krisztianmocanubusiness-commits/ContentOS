import type { ContentStatus } from "@/lib/mock-data";

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
