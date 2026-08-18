import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("system.notFound");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <FileQuestion className="text-faint mb-1 size-8" strokeWidth={1.5} />
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("heading")}
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">{t("description")}</p>
      <div className="mt-2">
        <Button asChild>
          <Link href="/">{t("backToHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
