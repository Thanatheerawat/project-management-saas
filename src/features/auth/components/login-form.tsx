"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/hooks/use-login";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { translateValidationMessage } from "@/features/auth/schemas/validation-messages";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      await login.mutateAsync(parsed.data);
      toast.success(t("signedInSuccessfully"));
      // "/workspaces" (not "/profile") — it already resolves 0/1/many
      // memberships correctly (see workspaces/page.tsx), so a plain login
      // lands the user in the actual app instead of a dead-end settings
      // page. Only an explicit callbackUrl (e.g. a protected link someone
      // followed while signed out) overrides this.
      router.push(searchParams.get("callbackUrl") ?? "/workspaces");
      router.refresh();
    } catch {
      // Same message regardless of whether the email exists or the
      // password was wrong — see docs/security.md (A04). useLogin()
      // throws a plain Error (next-auth's own flow, not our ApiError), so
      // there's no server-provided code to map here — this is always the
      // one fixed message.
      const message = t("invalidCredentials");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          {t("email")}
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
          {t("password")}
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? t("signingIn") : t("signIn")}
      </Button>
      <div className="flex justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground"
        >
          {t("forgotPasswordLink")}
        </Link>
        <Link href="/register" className="text-muted-foreground hover:text-foreground">
          {t("createAccountLink")}
        </Link>
      </div>
    </form>
  );
}
