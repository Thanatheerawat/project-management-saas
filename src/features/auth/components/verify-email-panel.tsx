"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/features/auth/hooks/use-verify-email";

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
        <p className="text-destructive text-sm">{t("errors.linkInvalidOrExpired")}</p>
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
