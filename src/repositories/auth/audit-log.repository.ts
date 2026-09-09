import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// userId is optional — a failed login against an email with no matching
// account is still worth recording (see docs/security.md, A09).
export const auditLogRepository = {
  record(action: AuditAction, userId?: string, metadata?: Prisma.InputJsonValue) {
    return prisma.auditLog.create({ data: { action, userId, metadata } });
  },

  // --- Milestone 6: Admin Dashboard ---------------------------------
  // The first read access this table has ever had — every action since
  // Milestone 2 has been recorded via record() above but never surfaced
  // anywhere until now. Includes a narrow `user` projection (id/name/
  // email only, never the full row) for the same password-hash-safety
  // reason every other mapper-facing include in this codebase follows.
  findMany({ skip, take, action }: { skip: number; take: number; action?: AuditAction }) {
    return prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },

  countAll(action?: AuditAction) {
    return prisma.auditLog.count({ where: action ? { action } : undefined });
  },

  // --- Milestone 8.6: Security Activity -------------------------------
  // Scoped to exactly one user (never a caller-supplied filter beyond
  // that) and an explicit `select` — metadata is never fetched at all
  // for this path, not just omitted from the response later. This is the
  // *only* read path into this table that isn't admin-gated, so it's
  // deliberately narrower than findMany() above.
  findRecentForUser(userId: string, take: number, actions?: AuditAction[]) {
    return prisma.auditLog.findMany({
      where: { userId, ...(actions ? { action: { in: actions } } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, action: true, createdAt: true },
    });
  },
};
