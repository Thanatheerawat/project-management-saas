import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

// Increment 3D translates this — metadata is out of scope for 3B.
export const metadata: Metadata = { title: "Sign In — Orbit" };

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("signInHeading")}
      </h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
