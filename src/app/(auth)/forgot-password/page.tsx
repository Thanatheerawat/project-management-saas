import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

// Reuses `auth.forgotPasswordHeading` (the page's own visible h1) plus
// the same literal " — Orbit" brand suffix every page in this group uses.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: `${t("forgotPasswordHeading")} — Orbit` };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("forgotPasswordHeading")}
      </h1>
      <ForgotPasswordForm />
    </div>
  );
}
