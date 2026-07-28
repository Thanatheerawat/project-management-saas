import type { PlatformRole } from "@/generated/prisma/client";

// Platform-level role only — see the scope note in schema.prisma and
// docs/session-log.md. Workspace-level RBAC (Owner/Admin/Member) is the
// separate helper in workspace-rbac.ts, introduced in Milestone 3.
const ROLE_RANK: Record<PlatformRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

export function hasRole(role: PlatformRole, minRole: PlatformRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Throws instead of returning a boolean so callers (Route Handlers) can
// let it propagate to a single shared error handler rather than each
// writing its own 403 branch.
export function requireRole(
  role: PlatformRole | undefined | null,
  minRole: PlatformRole,
): void {
  if (!role || !hasRole(role, minRole)) {
    throw new ForbiddenError();
  }
}
