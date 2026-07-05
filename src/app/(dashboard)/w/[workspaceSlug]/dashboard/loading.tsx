import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="mb-3 h-10 w-full" />
          ))}
        </Card>
        <Card className="p-6">
          <Skeleton className="mb-4 h-5 w-24" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="mb-3 h-10 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
