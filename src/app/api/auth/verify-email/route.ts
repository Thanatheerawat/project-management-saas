import { NextResponse } from "next/server";

import { verifyEmailSchema } from "@/features/auth/schemas/verify-email.schema";
import { handleApiError } from "@/lib/api-error";
import { hashToken } from "@/lib/auth/tokens";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { userRepository } from "@/repositories/auth/user.repository";
import { verificationTokenRepository } from "@/repositories/auth/verification-token.repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token } = verifyEmailSchema.parse(body);

    const record = await verificationTokenRepository.findValid(email, hashToken(token));
    if (!record) {
      return NextResponse.json(
        {
          error: "invalid_token",
          message: "This verification link is invalid or has expired",
        },
        { status: 400 },
      );
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "not_found", message: "Account not found" },
        { status: 404 },
      );
    }

    await userRepository.verifyEmail(user.id);
    await verificationTokenRepository.delete(email, hashToken(token));
    await auditLogRepository.record("EMAIL_VERIFIED", user.id);

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
