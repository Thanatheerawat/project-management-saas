import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ — Orbit" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">เข้าสู่ระบบ</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
