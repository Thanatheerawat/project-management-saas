import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

// Increment 3D translates this — metadata is out of scope for 3B.
export const metadata: Metadata = { title: "Forgot Password — Orbit" };

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
