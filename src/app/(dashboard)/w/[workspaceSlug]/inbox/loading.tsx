import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-80" />
      </div>

      <Card className="flex h-[600px] overflow-hidden p-0">
        <div className="flex w-full max-w-xs shrink-0 flex-col gap-3 border-r border-border p-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-4 w-48" />
        </div>
      </Card>
    </div>
  );
}
