import type { WorkspaceRole } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/auth/rbac";

// Workspace-level role only (Owner > Admin > Member) — a separate helper
// from PlatformRole's hasRole/requireRole (rbac.ts) by design: workspace
// role isn't a single field on User, it's per-(workspace, user) via
// WorkspaceMember, so callers resolve membership first (see
// workspace-membership.ts) and pass the resulting role in here. A platform
// SUPER_ADMIN does not automatically satisfy a workspace role check — the
// two tiers are deliberately independent (see the Milestone 3 Architecture
// Proposal in docs/session-log.md).
const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export function hasWorkspaceRole(role: WorkspaceRole, minRole: WorkspaceRole): boolean {
  return WORKSPACE_ROLE_RANK[role] >= WORKSPACE_ROLE_RANK[minRole];
}

// Throws the same ForbiddenError as requireRole so a single handleApiError
// branch covers both platform- and workspace-level 403s.
export function requireWorkspaceRole(
  role: WorkspaceRole | undefined | null,
  minRole: WorkspaceRole,
): void {
  if (!role || !hasWorkspaceRole(role, minRole)) {
    throw new ForbiddenError();
  }
}
