import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "สร้างบัญชี — Orbit" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">สร้างบัญชี</h1>
      <RegisterForm />
    </div>
  );
}
