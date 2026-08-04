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
};
