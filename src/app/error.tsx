"use client";

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
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-foreground text-2xl font-bold">เกิดข้อผิดพลาด</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        มีบางอย่างผิดพลาดระหว่างโหลดหน้านี้ ลองใหม่อีกครั้งได้
      </p>
      <Button onClick={reset} className="mt-2">
        ลองอีกครั้ง
      </Button>
    </div>
  );
}
