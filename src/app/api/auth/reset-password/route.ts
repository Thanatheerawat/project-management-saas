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
