"use client";

import { MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useResendVerification } from "@/features/auth/hooks/use-resend-verification";
import { useProfile } from "@/features/user/hooks/use-profile";
import { ApiError } from "@/lib/api-client";

// Matches the repository's own VERIFICATION_RESEND_COOLDOWN_MS
// (src/repositories/auth/verification-token.repository.ts) — this is
// UX-only pacing so the button doesn't sit clickable through an obvious
// no-op; the server enforces the real limit regardless of what the client
// believes, so a few seconds of drift here has no security consequence.
const COOLDOWN_SECONDS = 60;

// Mounted in both authenticated shells ((dashboard)/layout.tsx and
// w/[slug]/layout.tsx) — renders nothing until profile data loads, and
// nothing at all once emailVerified is set, so a verified user (the
// overwhelming common case once this ships) never sees any trace of it.
// Violet only, no cyan: this is an ordinary account action, not
// AI/system-state, per the Signal & Structure token rules.
export function VerificationBanner() {
  const t = useTranslations("auth");
  const profile = useProfile();
  const resend = useResendVerification();
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (cooldownUntil === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) setCooldownUntil(null);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  if (profile.isLoading || !profile.data || profile.data.emailVerified) {
    return null;
  }

  const isCoolingDown = cooldownUntil !== null;

  async function handleResend() {
    setError(null);
    setSuccess(false);
    try {
      await resend.mutateAsync();
      setSuccess(true);
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
    } catch (err) {
      if (err instanceof ApiError && err.code === "rate_limited") {
        setError(t("errors.resendRateLimited"));
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
      } else {
        setError(t("errors.resendFailed"));
      }
    }
  }

  return (
    <Card className="ring-accent/20 mb-6 [--card-spacing:--spacing(4)]">
      <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="bg-accent/10 flex size-9 shrink-0 items-center justify-center rounded-full">
            <MailWarning className="text-accent size-4.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-foreground text-sm font-medium">
              {t("verificationBanner.title")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("verificationBanner.description")}
            </p>
            {success && !error && (
              <p className="text-foreground text-xs font-medium">
                {t("verificationBanner.resendSuccess")}
              </p>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleResend}
          disabled={resend.isPending || isCoolingDown}
          className="w-full shrink-0 sm:w-auto"
        >
          {resend.isPending
            ? t("sending")
            : isCoolingDown
              ? `${t("resendVerification")} (${remainingSeconds}s)`
              : t("resendVerification")}
        </Button>
      </CardContent>
    </Card>
  );
}
