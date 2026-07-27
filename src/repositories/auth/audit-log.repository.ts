import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// userId is optional — a failed login against an email with no matching
// account is still worth recording (see docs/security.md, A09).
export const auditLogRepository = {
  record(action: AuditAction, userId?: string, metadata?: Prisma.InputJsonValue) {
    return prisma.auditLog.create({ data: { action, userId, metadata } });
  },
};
