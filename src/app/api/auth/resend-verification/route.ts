import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { logger } from "@/lib/logger";
import { userRepository } from "@/repositories/auth/user.repository";
import {
  VERIFICATION_RESEND_COOLDOWN_MS,
  VERIFICATION_TOKEN_TTL_MS,
  verificationTokenRepository,
} from "@/repositories/auth/verification-token.repository";
import { emailService } from "@/services/auth/email.service";

// M8.2: authenticated-only, matching the approved scope ("prefer the
// authenticated flow for the dashboard banner if that is sufficient") —
// there is no logged-out variant. The dashboard banner and the
// verify-email panel (reached right after register, which already signs
// the user in — see register-form.tsx) are both always-authenticated call
// sites, so there's no real UX gap and no need for the anti-enumeration
// handling an unauthenticated variant would require.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const user = await userRepository.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "not_found", message: "Account not found" },
        { status: 404 },
      );
    }

    // Safe no-op, not an error — the caller (banner/panel) already knows
    // who this is, so there's no enumeration risk in saying so plainly.
    if (user.emailVerified) {
      return NextResponse.json({ message: "Email is already verified" });
    }

    // Cooldown: derive the most recent token's creation time as
    // `expires - TTL` (see the repository's own comment for why there's
    // no stored createdAt to read directly).
    const mostRecent = await verificationTokenRepository.findMostRecentByIdentifier(
      user.email,
    );
    if (mostRecent) {
      const createdAt = mostRecent.expires.getTime() - VERIFICATION_TOKEN_TTL_MS;
      const elapsedMs = Date.now() - createdAt;
      if (elapsedMs < VERIFICATION_RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
          (VERIFICATION_RESEND_COOLDOWN_MS - elapsedMs) / 1000,
        );
        return NextResponse.json(
          {
            error: "rate_limited",
            message: "Please wait before requesting another verification email",
            retryAfterSeconds,
          },
          { status: 429 },
        );
      }
    }

    // Invalidate any still-outstanding token(s) before minting a new one
    // — keeps exactly one live token per user instead of letting repeated
    // resends pile up (M8.2 scope: "avoid leaving an uncontrolled number
    // of valid verification tokens active").
    await verificationTokenRepository.deleteAllForIdentifier(user.email);

    const rawToken = generateToken();
    await verificationTokenRepository.create(
      user.email,
      hashToken(rawToken),
      new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    );

    // Same URL shape register/route.ts already builds (absolute, derived
    // from the incoming request) — reusing the existing /verify-email
    // page and its email/token query contract rather than inventing a
    // second one.
    const verifyUrl = new URL(
      `/verify-email?email=${encodeURIComponent(user.email)}&token=${rawToken}`,
      request.url,
    );

    // Unlike register.ts, this route's entire purpose is "did my email
    // just send" — silently returning success here would leave the user
    // with no signal at all and no live token to fall back on, so a
    // delivery failure is surfaced explicitly instead. The token we just
    // minted is removed on failure (never delivered, so keeping it would
    // both dangle an unreachable-but-valid token *and* start the cooldown
    // — which exists to rate-limit actual sends — for an email that never
    // went out, blocking an immediate retry for no reason).
    try {
      await emailService.sendVerificationEmail(user.email, verifyUrl.toString());
    } catch (emailError) {
      logger.error("Failed to send verification email (resend)", {
        message: emailError instanceof Error ? emailError.message : String(emailError),
      });
      await verificationTokenRepository.delete(user.email, hashToken(rawToken));
      return NextResponse.json(
        {
          error: "email_delivery_failed",
          message:
            "We couldn't send the verification email right now. Please try again later.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    return handleApiError(error);
  }
}
