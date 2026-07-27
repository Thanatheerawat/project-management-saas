import { NextResponse } from "next/server";

import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";
import { handleApiError } from "@/lib/api-error";
import { generateToken, hashToken } from "@/lib/auth/tokens";
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
      await emailService.sendPasswordResetEmail(user.email, resetUrl.toString());
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    return handleApiError(error);
  }
}
