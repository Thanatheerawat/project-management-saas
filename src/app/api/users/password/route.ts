import { NextResponse } from "next/server";

import { changePasswordSchema } from "@/features/user/schemas/change-password.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { userRepository } from "@/repositories/auth/user.repository";

// M8.4: authenticated self-service password change. Distinct from
// reset-password/route.ts (M8.3) — that flow proves identity with a
// mailed token for a user who can't sign in; this one proves identity
// with the current password for a user who already can. Session lookup
// follows the exact pattern resend-verification/route.ts (M8.2)
// established: 401 with no session, 404 if the session's user id no
// longer resolves to a real account — no extra isActive check, since no
// other authenticated self-service route in this codebase adds one
// either (an admin-deactivated account keeping a live session until its
// JWT naturally expires is a pre-existing, out-of-scope gap).
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const user = await userRepository.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "not_found", message: "Account not found" },
        { status: 404 },
      );
    }

    // Defensive only — every account today is created through
    // register/route.ts, which always sets passwordHash. The schema
    // field is optional (`String?`) purely so a future OAuth provider
    // (not yet implemented) can create passwordless accounts without a
    // migration; this guards that case rather than one reachable today.
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: "no_password_set",
          message: "This account does not have a password to change",
        },
        { status: 400 },
      );
    }

    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "current_password_incorrect", message: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // Compare against the stored hash rather than `newPassword ===
    // currentPassword` — the two request fields could differ as plain
    // strings while still hashing to the account's current password
    // (e.g. currentPassword has trailing whitespace bcrypt ignores), and
    // this is the check that actually matters: would this update be a
    // no-op against the database.
    const isSameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      return NextResponse.json(
        {
          error: "password_unchanged",
          message: "New password must be different from your current password",
        },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(user.id, passwordHash);
    await auditLogRepository.record("PASSWORD_CHANGED", user.id);

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
