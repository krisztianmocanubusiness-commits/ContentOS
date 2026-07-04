import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContentLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 flex-1 sm:max-w-xs" />
        <Skeleton className="h-9 w-full sm:w-40" />
      </div>

      <div className="mb-4 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Card key={i} className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    </div>
  );
}
