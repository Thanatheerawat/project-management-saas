import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

// Deliberately minimal — no invented links (no fake blog/docs/social
// icons), just the brand mark, the same one-line description the landing
// hero already uses, and a copyright line. Shared between the landing
// page and the pre-auth (login/register/etc.) layout so the "same
// product" feeling carries all the way through, not just on "/".
export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-border border-t">
      <PageContainer className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-foreground text-sm font-bold">Orbit</span>
          <p className="text-muted-foreground text-sm">{t("tagline")}</p>
        </div>
        <p className="text-faint text-xs">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </PageContainer>
    </footer>
  );
}
