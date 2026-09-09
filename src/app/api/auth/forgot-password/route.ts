import { NextResponse } from "next/server";

import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";
import { handleApiError } from "@/lib/api-error";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { logger } from "@/lib/logger";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { passwordResetTokenRepository } from "@/repositories/auth/password-reset-token.repository";
import { userRepository } from "@/repositories/auth/user.repository";
import { emailService } from "@/services/auth/email.service";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const GENERIC_MESSAGE =
  "If an account with that email exists, a reset link has been sent.";

// Always returns the same response whether or not the email exists — see
// docs/security.md (A04), account enumeration is prevented by design.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await userRepository.findByEmail(email);
    if (user && user.isActive) {
      const rawToken = generateToken();
      await passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      await auditLogRepository.record("PASSWORD_RESET_REQUESTED", user.id);

      const resetUrl = new URL(`/reset-password?token=${rawToken}`, request.url);
      // M8.3: a provider failure (e.g. Resend down/misconfigured) must
      // never change this endpoint's response — letting it propagate to
      // the outer catch would return a 500 only for emails that belong to
      // a real active account, which is exactly the account-enumeration
      // side channel this route's generic-response design exists to
      // prevent. Logged server-side only; never surfaced to the caller.
      try {
        await emailService.sendPasswordResetEmail(user.email, resetUrl.toString());
      } catch (emailError) {
        logger.error("Failed to send password reset email", {
          message: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    return handleApiError(error);
  }
}
