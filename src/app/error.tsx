"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <AlertTriangle className="text-faint mb-1 size-8" strokeWidth={1.5} />
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        An error occurred while loading this page. Please try again.
      </p>
      <div className="mt-2">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
