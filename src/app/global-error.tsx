"use client";

import { AlertTriangle } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Only triggers if the root layout itself throws — kept self-contained
// (own <html>/<body>) since providers, including ThemeProvider, may not
// be mounted. Still reuses the app's real design tokens/Button/font
// (all provider-free — no context or hooks beyond React itself) instead
// of hand-rolled neutral colors, so a crash screen doesn't look like a
// different, unbranded app. Dark mode specifically can't be guaranteed
// without ThemeProvider to read the user's preference, so this renders
// in the light-mode token values — still the real design-system colors,
// just not theme-aware.
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
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <AlertTriangle className="text-faint mb-1 size-8" strokeWidth={1.5} />
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          แอปพลิเคชันขัดข้อง
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          เกิดข้อผิดพลาดร้ายแรง โปรดลองโหลดหน้าใหม่อีกครั้ง
        </p>
        <div className="mt-2 flex gap-2">
          <Button onClick={reset}>โหลดใหม่</Button>
          <Button variant="outline" asChild>
            <Link href="/">กลับหน้าหลัก</Link>
          </Button>
        </div>
      </body>
    </html>
  );
}
