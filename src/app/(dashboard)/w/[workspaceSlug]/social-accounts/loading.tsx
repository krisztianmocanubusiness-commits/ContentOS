import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SocialAccountsLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <Card className="overflow-hidden py-0">
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-6 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
