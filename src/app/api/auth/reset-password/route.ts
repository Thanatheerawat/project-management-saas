import { NextResponse } from "next/server";

import { resetPasswordSchema } from "@/features/auth/schemas/reset-password.schema";
import { handleApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { passwordResetTokenRepository } from "@/repositories/auth/password-reset-token.repository";
import { userRepository } from "@/repositories/auth/user.repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = resetPasswordSchema.parse(body);

    const record = await passwordResetTokenRepository.findValid(hashToken(token));
    if (!record) {
      // M8.3: findValid already filters out an expired/used row, so
      // distinguish which one for a clearer UI message — the actual reset
      // gate is unchanged, still findValid alone; this is purely an extra
      // read for better error copy, same pattern M8.2 added to
      // verify-email/route.ts.
      const existing = await passwordResetTokenRepository.findByTokenHash(
        hashToken(token),
      );
      if (existing?.usedAt) {
        return NextResponse.json(
          { error: "token_used", message: "This reset link has already been used" },
          { status: 400 },
        );
      }
      if (existing && existing.expiresAt <= new Date()) {
        return NextResponse.json(
          { error: "token_expired", message: "This reset link has expired" },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "invalid_token", message: "This reset link is invalid or has expired" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(record.userId, passwordHash);
    await passwordResetTokenRepository.markUsed(record.id);
    await auditLogRepository.record("PASSWORD_RESET_COMPLETED", record.userId);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
