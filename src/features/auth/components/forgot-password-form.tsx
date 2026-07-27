"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password";
import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    await forgotPassword.mutateAsync(parsed.data);
  }

  // Same confirmation shown whether or not the email exists — the API
  // itself never reveals which (docs/security.md, A04).
  if (forgotPassword.isSuccess) {
    return (
      <p className="text-muted-foreground text-sm">
        ถ้ามีบัญชีที่ใช้อีเมลนี้ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปแล้ว
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          อีเมล
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={forgotPassword.isPending}>
        {forgotPassword.isPending ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
