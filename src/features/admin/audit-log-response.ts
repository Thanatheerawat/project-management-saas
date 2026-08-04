import type { AuditAction, AuditLog } from "@/generated/prisma/client";

// `satisfies` fails to compile if AuditAction (schema.prisma) ever
// diverges from this literal list — same pattern as ISSUE_STATUSES/
// PLATFORM_ROLES. Used by the audit-log Route Handler to validate the
// `?action=` filter query param (an unrecognized value is treated as no
// filter, not a 400 — a query-string filter, unlike a PATCH body, isn't
// worth failing the whole request over).
export const AUDIT_ACTIONS = [
  "REGISTER",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "EMAIL_VERIFIED",
  "PROFILE_UPDATED",
] as const satisfies readonly AuditAction[];

type AuditLogWithUser = AuditLog & {
  user: { id: string; name: string | null; email: string } | null;
};

// Used by the admin audit-log endpoint — the first response shape ever
// built for this table, which has recorded every REGISTER/LOGIN_SUCCESS/
// LOGIN_FAILED/etc. event since Milestone 2 with no UI to read it back
// until now. `user` is already a narrow projection from the repository
// query (auditLogRepository.findMany), never the full User row — `null`
// when the action has no matching account (e.g. a failed login against
// a nonexistent email, see schema.prisma's AuditLog comment).
export function toAuditLogEntryResponse(entry: AuditLogWithUser) {
  return {
    id: entry.id,
    action: entry.action,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
    user: entry.user,
  };
}
