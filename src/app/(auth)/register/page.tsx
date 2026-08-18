import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RegisterForm } from "@/features/auth/components/register-form";

// Increment 3D translates this — metadata is out of scope for 3B.
export const metadata: Metadata = { title: "Create Account — Orbit" };

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
