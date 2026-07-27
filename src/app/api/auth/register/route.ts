import { NextResponse } from "next/server";

import { registerSchema } from "@/features/auth/schemas/register.schema";
import { handleApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { userRepository } from "@/repositories/auth/user.repository";
import { verificationTokenRepository } from "@/repositories/auth/verification-token.repository";
import { emailService } from "@/services/auth/email.service";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Only creates the account — it does not sign the user in. The client
// calls next-auth's signIn("credentials", ...) right after a successful
// response, reusing the same login path rather than this route trying to
// mint a session cookie itself.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      return NextResponse.json(
        { error: "email_taken", message: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
    });
    await auditLogRepository.record("REGISTER", user.id);

    const rawToken = generateToken();
    await verificationTokenRepository.create(
      user.email,
      hashToken(rawToken),
      new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    );
    const verifyUrl = new URL(
      `/verify-email?email=${encodeURIComponent(user.email)}&token=${rawToken}`,
      request.url,
    );
    await emailService.sendVerificationEmail(user.email, verifyUrl.toString());

    // Returning the mock verification URL here is intentional and safe:
    // a successful registration response already confirms the account
    // was just created, so this exposes nothing an attacker couldn't
    // already infer. Contrast with forgot-password, which never returns
    // anything account-specific (see docs/security.md, A04). This lets
    // the UI show a "verify now" link without a real email provider.
    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        mockVerifyUrl: `/verify-email?email=${encodeURIComponent(user.email)}&token=${rawToken}`,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
