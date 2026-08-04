import type { Session } from "next-auth";

import type { PlatformRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

let counter = 0;

// Shared by every workspace/project/member integration test that mocks
// @/lib/auth/auth (see profile-and-me.integration.test.ts for why: the
// route handlers read the session via getServerSession, which needs a real
// Next.js request context a plain Vitest call can't provide).
// `role` defaults to "USER" — every pre-Milestone-6 call site omits it and
// keeps its exact prior behavior; the admin integration suite is the first
// caller to pass "ADMIN"/"SUPER_ADMIN" explicitly.
export function sessionFor(userId: string, role: PlatformRole = "USER"): Session {
  return {
    user: { id: userId, role },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}

// Unique per test run so parallel `it` blocks across files never collide
// on the User.email unique constraint against the shared Neon database.
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@orbit-integration-test.local`;
}

// Same uniqueness reasoning as uniqueEmail, for Workspace.slug — lowercase
// alphanumeric-and-hyphens only, matching workspaceSlugSchema's regex.
export function uniqueSlug(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`.toLowerCase();
}

// Cleans up everything a test may have created for one email, in FK-safe
// order. PasswordResetToken/Account/Session cascade-delete with the user;
// AuditLog uses onDelete: SetNull so it's deleted explicitly first, and
// VerificationToken has no relation to User at all (identifier is a plain
// string), so it's always deleted by email regardless of user existing.
export async function deleteTestUser(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  if (user) {
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

// deleteMany (not delete) so a test that already deleted the workspace
// itself (e.g. the DELETE /api/workspaces/[id] test) doesn't need a
// try/catch in its afterEach — WorkspaceMember/Project rows cascade with
// the workspace (onDelete: Cascade in schema.prisma).
export async function deleteTestWorkspace(id: string): Promise<void> {
  await prisma.workspace.deleteMany({ where: { id } });
}
