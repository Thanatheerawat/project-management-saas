"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useResendVerification } from "@/features/auth/hooks/use-resend-verification";
import { useVerifyEmail } from "@/features/auth/hooks/use-verify-email";
import { ApiError } from "@/lib/api-client";

// There is no real email provider yet (docs/security.md notes this
// explicitly) — the register flow redirects here with the mock link's
// email/token already in the URL so this is directly demoable without a
// real inbox.
export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // M8.2: register-form.tsx already signs the user in (signIn("credentials",
  // ...)) before redirecting here, so this page is always reached
  // authenticated — the resend action can safely use the session-derived
  // endpoint, no email/token needed for it.
  async function handleResend() {
    setResendMessage(null);
    try {
      await resend.mutateAsync();
      setResendMessage(t("verificationBanner.resendSuccess"));
    } catch (err) {
      setResendMessage(
        err instanceof ApiError && err.code === "rate_limited"
          ? t("errors.resendRateLimited")
          : t("errors.resendFailed"),
      );
    }
  }

  if (verifyEmail.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-foreground text-sm">{t("verifyEmailSuccessMessage")}</p>
        {/* "/workspaces", not "/profile" — same reasoning as login-form.tsx:
            it already resolves 0/1/many memberships into the actual app
            instead of stranding a brand-new user on a settings page. */}
        <Button asChild>
          <Link href="/workspaces">{t("goToWorkspace")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="bg-muted text-foreground border-border rounded-md border px-3 py-2 text-xs font-medium">
        {t("verifyEmailMockBanner")}
      </p>
      {/* `email` is the user's own address (from the URL, echoing what
          register just submitted) — interpolated via next-intl, never
          translated or altered itself. */}
      <p className="text-muted-foreground text-sm">
        {t("verifyEmailInstructions", { email })}
      </p>
      {verifyEmail.isError && (
        <div className="flex flex-col gap-2">
          {/* Distinguishes "expired" from "invalid/already used" per the
              M8.2 error codes verify-email/route.ts now returns — falls
              back to the original generic copy for anything else (a
              network failure, etc.), same as before this change. */}
          <p className="text-destructive text-sm">
            {verifyEmail.error instanceof ApiError &&
            verifyEmail.error.code === "token_expired"
              ? t("errors.tokenExpired")
              : verifyEmail.error instanceof ApiError &&
                  verifyEmail.error.code === "invalid_token"
                ? t("errors.tokenInvalid")
                : t("errors.linkInvalidOrExpired")}
          </p>
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs">
              {t("verificationBanner.needNewLink")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={handleResend}
              disabled={resend.isPending}
            >
              {resend.isPending ? t("sending") : t("resendVerification")}
            </Button>
            {resendMessage && (
              <p className="text-muted-foreground text-xs">{resendMessage}</p>
            )}
          </div>
        </div>
      )}
      <Button
        onClick={() =>
          verifyEmail.mutate(
            { email, token },
            {
              onSuccess: () => toast.success(t("verifyEmailToastSuccess")),
              onError: () => toast.error(t("verifyEmailToastError")),
            },
          )
        }
        disabled={!email || !token || verifyEmail.isPending}
      >
        {verifyEmail.isPending ? t("verifying") : t("verifyEmail")}
      </Button>
    </div>
  );
}
