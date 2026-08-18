import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

// Reuses `auth.resetPassword` (the page's own visible h1) plus the same
// literal " — Orbit" brand suffix every page in this group uses.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: `${t("resetPassword")} — Orbit` };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("resetPassword")}
      </h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
