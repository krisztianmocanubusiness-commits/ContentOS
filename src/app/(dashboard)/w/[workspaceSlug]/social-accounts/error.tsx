"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SocialAccountsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Social accounts failed to load:", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Couldn&apos;t load social accounts</p>
        <p className="text-sm text-muted-foreground">
          Something went wrong fetching this workspace&apos;s connected channels.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
