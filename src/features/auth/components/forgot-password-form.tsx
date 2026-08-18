"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password";
import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";
import { translateValidationMessage } from "@/features/auth/schemas/validation-messages";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      await forgotPassword.mutateAsync(parsed.data);
      toast.success(t("forgotPasswordSentToast"));
    } catch {
      // This route never returns a distinguishing error code (A04 — same
      // response whether or not the account exists), so there is nothing
      // to map; a thrown error here only ever means the request itself
      // failed (network, 500, etc.).
      toast.error(t("forgotPasswordRequestFailed"));
    }
  }

  // Same confirmation shown whether or not the email exists — the API
  // itself never reveals which (docs/security.md, A04).
  if (forgotPassword.isSuccess) {
    return (
      <p className="text-muted-foreground text-sm">{t("forgotPasswordSuccessMessage")}</p>
    );
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
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={forgotPassword.isPending}>
        {forgotPassword.isPending ? t("sending") : t("sendResetLink")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
