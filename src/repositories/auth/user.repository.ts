import type { PlatformRole } from "@/generated/prisma/client";
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

  // --- Milestone 6: Admin Dashboard --------------------------------
  // Platform-wide (no per-workspace scope), unlike every method above —
  // this is the first repository access here that isn't "the current
  // user's own record." `emailQuery` is shared between the list and its
  // count so a paginated total always matches what the filtered list
  // itself returned.

  findManyForAdmin({
    skip,
    take,
    emailQuery,
  }: {
    skip: number;
    take: number;
    emailQuery?: string;
  }) {
    return prisma.user.findMany({
      where: emailQuery
        ? { email: { contains: emailQuery, mode: "insensitive" } }
        : undefined,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { workspaceMemberships: true } } },
    });
  },

  countAll(emailQuery?: string) {
    return prisma.user.count({
      where: emailQuery
        ? { email: { contains: emailQuery, mode: "insensitive" } }
        : undefined,
    });
  },

  // Includes every workspace this user belongs to (with their role in
  // each) for the admin user-detail page — a platform admin needs to see
  // "what is this person a member of," not just their own account fields.
  findByIdForAdmin(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { workspaceMemberships: { include: { workspace: true } } },
    });
  },

  updateRole(id: string, role: PlatformRole) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  updateActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  },
};
