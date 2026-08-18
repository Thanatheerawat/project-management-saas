import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

// Increment 3D translates this — metadata is out of scope for 3B.
export const metadata: Metadata = { title: "Reset Password — Orbit" };

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
