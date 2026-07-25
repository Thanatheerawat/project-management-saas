"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";

// Only triggers if the root layout itself throws — kept minimal and
// self-contained (own <html>/<body>) since providers may not be mounted.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Root layout crashed", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center text-neutral-900">
        <h1 className="text-2xl font-bold">แอปพลิเคชันขัดข้อง</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          เกิดข้อผิดพลาดร้ายแรง โปรดลองโหลดหน้าใหม่อีกครั้ง
        </p>
        <button
          onClick={reset}
          className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          โหลดใหม่
        </button>
      </body>
    </html>
  );
}
