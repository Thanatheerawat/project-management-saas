import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RegisterForm } from "@/features/auth/components/register-form";

// Reuses `auth.createAccount` (the page's own visible h1) plus the same
// literal " — Orbit" brand suffix every page in this group uses.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: `${t("createAccount")} — Orbit` };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("createAccount")}
      </h1>
      <RegisterForm />
    </div>
  );
}
