import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <Card className="overflow-hidden p-4">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
