"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { translateValidationMessage } from "@/features/auth/schemas/validation-messages";
import { useChangePassword } from "@/features/user/hooks/use-change-password";
import { changePasswordSchema } from "@/features/user/schemas/change-password.schema";
import { ApiError } from "@/lib/api-client";

// Self-contained Card (icon + heading + form), same shape as
// VerificationBanner — mounted directly into profile/page.tsx, a Server
// Component that otherwise stays plain hardcoded English (see
// ProfileForm's own comment). Using next-intl here only, not retrofitting
// the rest of the page, keeps this change tightly scoped to M8.4.
export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Client-only check — confirmPassword is never sent to the server,
    // same decision reset-password.schema.ts made for its own confirm
    // field (see change-password.schema.ts).
    if (newPassword !== confirmPassword) {
      setError(t("validation.passwordsDoNotMatch"));
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      await changePassword.mutateAsync(parsed.data);
      toast.success(t("changePasswordSuccessToast"));
      // Per spec: clear fields, stay on the page — no sign-out, redirect,
      // or re-authentication. The JWT session only carries id/role (see
      // auth.config.ts's jwt callback), never passwordHash, so nothing
      // about the existing session is stale after this.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "current_password_incorrect"
          ? t("errors.currentPasswordIncorrect")
          : err instanceof ApiError && err.code === "password_unchanged"
            ? t("errors.newPasswordSameAsCurrent")
            : t("errors.changePasswordFailed");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 flex size-9 shrink-0 items-center justify-center rounded-full">
            <Lock className="text-accent size-4.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("changePasswordSectionTitle")}</CardTitle>
            <CardDescription>{t("changePasswordSectionDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="currentPassword"
              className="text-foreground text-sm font-medium"
            >
              {t("currentPassword")}
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
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
            <label
              htmlFor="confirmNewPassword"
              className="text-foreground text-sm font-medium"
            >
              {t("confirmPassword")}
            </label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="submit"
            disabled={changePassword.isPending}
            className="self-start"
          >
            {changePassword.isPending ? t("changingPassword") : t("changePasswordButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
