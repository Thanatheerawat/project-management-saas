import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { VerifyEmailPanel } from "@/features/auth/components/verify-email-panel";

// Increment 3D translates this — metadata is out of scope for 3B.
export const metadata: Metadata = { title: "Verify Email — Orbit" };

export default async function VerifyEmailPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("verifyEmail")}
      </h1>
      <Suspense>
        <VerifyEmailPanel />
      </Suspense>
    </div>
  );
}
