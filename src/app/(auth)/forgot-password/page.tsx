import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน — Orbit" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">ลืมรหัสผ่าน</h1>
      <ForgotPasswordForm />
    </div>
  );
}
