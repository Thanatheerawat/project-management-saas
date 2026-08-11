import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign In — Orbit" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">Sign In</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
