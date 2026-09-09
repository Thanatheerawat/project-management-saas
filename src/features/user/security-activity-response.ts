import type { SecurityActivityAction } from "@/constants/security-activity";

// Deliberately not `AuditLog` (which also carries `userId`/`metadata`) —
// this route's repository call (`findRecentForUser`) already uses an
// explicit `select` that never fetches those columns, and this type is
// the second, independent layer: even a future accidental change to that
// `select` couldn't leak through this mapper's own narrow input shape.
interface SecurityActivityRow {
  id: string;
  action: SecurityActivityAction;
  createdAt: Date;
}

// The full response DTO — id (opaque, for a React list key, same as every
// other response in this app) + action (a stable code the client maps to
// a translated label/description via SECURITY_ACTIVITY_MESSAGE_KEYS) +
// occurredAt. No metadata field exists on this type at all.
export function toSecurityActivityEventResponse(row: SecurityActivityRow) {
  return {
    id: row.id,
    action: row.action,
    occurredAt: row.createdAt,
  };
}
