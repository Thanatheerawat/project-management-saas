import { NextResponse } from "next/server";

import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";
import { handleApiError } from "@/lib/api-error";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
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

    // TEMPORARY — M8 production incident diagnostic.
    // Remove after runtime DB identity is confirmed.
    try {
      const [branch] = await prisma.$queryRaw<{ branch_id: string | null }[]>`
        SELECT setting AS branch_id
        FROM pg_settings
        WHERE name = 'neon.branch_id'
      `;

      logger.info("m8-incident: runtime neon branch identity", {
        branchId: branch?.branch_id ?? null,
      });
    } catch (error) {
      logger.warn("m8-incident: runtime neon branch identity check failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    // TEMPORARY — M8 production incident diagnostic (schema visibility).
    // Remove after runtime DB identity is confirmed.
    try {
      const [identity] = await prisma.$queryRaw<
        {
          database: string;
          schema: string;
          role: string;
          server_addr: string | null;
          server_port: number | null;
        }[]
      >`
        SELECT
          current_database()::text AS database,
          current_schema()::text AS schema,
          current_user::text AS role,
          inet_server_addr()::text AS server_addr,
          inet_server_port() AS server_port
      `;

      const columns = await prisma.$queryRaw<
        {
          column_name: string;
          data_type: string;
          is_nullable: string;
          ordinal_position: number;
        }[]
      >`
        SELECT column_name::text AS column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User'
        ORDER BY ordinal_position
      `;

      const m8Fields = ["jobTitle", "bio", "location", "timezone", "website"] as const;
      const columnNames = new Set(columns.map((c) => c.column_name));
      const m8FieldStatus = Object.fromEntries(
        m8Fields.map((field) => [field, columnNames.has(field)]),
      );

      logger.info("m8-incident: runtime schema visibility", {
        identity,
        columnCount: columns.length,
        columns,
        m8FieldStatus,
      });
    } catch (error) {
      logger.warn("m8-incident: runtime schema visibility check failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

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
