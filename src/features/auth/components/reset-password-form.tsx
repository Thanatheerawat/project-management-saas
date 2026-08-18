"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useResetPassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ token, newPassword });
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      await resetPassword.mutateAsync(parsed.data);
      toast.success(t("resetPasswordSuccessToast"));
      router.push("/login");
    } catch (err) {
      // Known stable code -> its own translated message; anything else
      // (an ApiError with an unrecognized code, or no ApiError at all)
      // falls back to the same generic message, never the server's raw
      // English `err.message`.
      const message =
        err instanceof ApiError && err.code === "invalid_token"
          ? t("errors.invalidResetToken")
          : t("errors.linkInvalidOrExpired");
      setError(message);
      toast.error(message);
    }
  }

  if (!token) {
    return <p className="text-destructive text-sm">{t("resetPasswordLinkInvalid")}</p>;
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
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? t("saving") : t("resetPassword")}
      </Button>
    </form>
  );
}
