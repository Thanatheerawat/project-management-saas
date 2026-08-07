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
      <h1 className="text-foreground text-xl font-bold">เกิดข้อผิดพลาด</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        มีบางอย่างผิดพลาดระหว่างโหลดหน้านี้ ลองใหม่อีกครั้งได้
      </p>
      <div className="mt-2">
        <Button onClick={reset}>ลองอีกครั้ง</Button>
      </div>
    </div>
  );
}
