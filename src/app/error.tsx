"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("system.error");

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
        {t("heading")}
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">{t("description")}</p>
      <div className="mt-2">
        <Button onClick={reset}>{t("tryAgain")}</Button>
      </div>
    </div>
  );
}
