import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailPanel } from "@/features/auth/components/verify-email-panel";

export const metadata: Metadata = { title: "Verify Email — Orbit" };

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">Verify Email</h1>
      <Suspense>
        <VerifyEmailPanel />
      </Suspense>
    </div>
  );
}
