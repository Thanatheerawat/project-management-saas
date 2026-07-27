import { prisma } from "@/lib/prisma";

let counter = 0;

// Unique per test run so parallel `it` blocks across files never collide
// on the User.email unique constraint against the shared Neon database.
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@orbit-integration-test.local`;
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
