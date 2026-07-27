"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/features/auth/hooks/use-register";
import { registerSchema } from "@/features/auth/schemas/register.schema";
import { ApiError } from "@/lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      const result = await register.mutateAsync(parsed.data);
      // Register only creates the account — sign in through the same
      // path a normal login uses rather than the route minting a session
      // itself (see src/app/api/auth/register/route.ts).
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      router.push(result.mockVerifyUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          ชื่อ
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-foreground text-sm font-medium">
          รหัสผ่าน
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={register.isPending}>
        {register.isPending ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
