import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// The only place `prisma.user.*` is called from — Route Handlers and
// auth.config.ts call these functions instead of Prisma directly.
export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({ data });
  },

  updateProfile(id: string, data: { name?: string; image?: string }) {
    return prisma.user.update({ where: { id }, data });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  recordLoginSuccess(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  async recordLoginFailure(id: string): Promise<void> {
    const user = await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      await prisma.user.update({
        where: { id },
        data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
      });
    }
  },

  verifyEmail(id: string) {
    return prisma.user.update({ where: { id }, data: { emailVerified: new Date() } });
  },
};
