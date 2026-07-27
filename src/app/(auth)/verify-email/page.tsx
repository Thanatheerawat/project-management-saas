import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailPanel } from "@/features/auth/components/verify-email-panel";

export const metadata: Metadata = { title: "ยืนยันอีเมล — Orbit" };

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">ยืนยันอีเมล</h1>
      <Suspense>
        <VerifyEmailPanel />
      </Suspense>
    </div>
  );
}
