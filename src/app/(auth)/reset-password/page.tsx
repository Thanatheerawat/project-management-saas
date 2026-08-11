import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่ — Orbit" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        ตั้งรหัสผ่านใหม่
      </h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
