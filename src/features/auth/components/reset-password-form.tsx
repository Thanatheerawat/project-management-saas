"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResetPassword } from "@/features/auth/hooks/use-reset-password";
import { resetPasswordSchema } from "@/features/auth/schemas/reset-password.schema";
import { translateValidationMessage } from "@/features/auth/schemas/validation-messages";
import { ApiError } from "@/lib/api-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useResetPassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Client-only check — confirmPassword is never sent to the server
    // (resetPasswordSchema, shared with the API route, only ever accepts
    // {token, newPassword}; adding a field there would change the wire
    // contract for no server-side benefit).
    if (newPassword !== confirmPassword) {
      setError(t("validation.passwordsDoNotMatch"));
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ token, newPassword });
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      await resetPassword.mutateAsync(parsed.data);
      toast.success(t("resetPasswordSuccessToast"));
    } catch (err) {
      // Known stable codes -> their own translated message; anything else
      // (an ApiError with an unrecognized code, or no ApiError at all)
      // falls back to the same generic message, never the server's raw
      // English `err.message`. token_expired/token_used (M8.3) distinguish
      // the two cases the backend now reports separately; invalid_token
      // (never issued) keeps the original combined copy.
      const message =
        err instanceof ApiError && err.code === "token_expired"
          ? t("errors.resetTokenExpired")
          : err instanceof ApiError && err.code === "token_used"
            ? t("errors.resetTokenUsed")
            : err instanceof ApiError && err.code === "invalid_token"
              ? t("errors.invalidResetToken")
              : t("errors.linkInvalidOrExpired");
      setError(message);
      toast.error(message);
    }
  }

  if (!token) {
    return <p className="text-destructive text-sm">{t("resetPasswordLinkInvalid")}</p>;
  }

  // Dedicated success view (M8.3), same shape as VerifyEmailPanel's own
  // success state: a persistent message plus an explicit action, not an
  // automatic redirect out from under the user — "user returns to Login"
  // is a click, not something that happens to them.
  if (resetPassword.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-foreground text-sm">{t("resetPasswordSuccessMessage")}</p>
        <Button asChild>
          <Link href="/login">{t("goToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-foreground text-sm font-medium">
          {t("newPassword")}
        </label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-muted-foreground text-xs">{t("passwordMinHint")}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">
          {t("confirmPassword")}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? t("saving") : t("resetPassword")}
      </Button>
    </form>
  );
}
