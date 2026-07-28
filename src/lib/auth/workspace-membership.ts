import { cache } from "react";

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { requireWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

// Looks up the caller's membership row for a workspace. Returns null both
// when the workspace doesn't exist and when it exists but the caller isn't
// a member — callers should treat null as 404 Not Found, not 403
// Forbidden, so a non-member can't tell a private workspace apart from one
// that was never there (same account-enumeration-safe philosophy as
// forgot-password in Milestone 2). Resolve this first, then pass
// `.role` into requireWorkspaceRole (workspace-rbac.ts) for the actual
// permission check.
export function resolveWorkspaceMembership(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMember | null> {
  return workspaceMemberRepository.findByWorkspaceAndUser(workspaceId, userId);
}

// Composes the two steps above for the common case (used by most
// workspace-scoped routes): resolve membership, then check role. Still
// returns null — not a thrown 404 — when there's no membership, so every
// caller keeps making its own explicit 404 response inline (same style as
// every other "not found" case in this codebase; only the 403 path is
// exception-based, via requireWorkspaceRole).
export async function requireWorkspaceAccess(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole,
): Promise<WorkspaceMember | null> {
  const membership = await resolveWorkspaceMembership(workspaceId, userId);
  if (!membership) return null;
  requireWorkspaceRole(membership.role, minRole);
  return membership;
}

// Server Component equivalent of requireWorkspaceAccess, for the /w/[slug]
// route tree: resolves a slug to a workspace and checks membership in one
// call, returning null for both "no such workspace" and "not a member" —
// callers (layout.tsx, page.tsx) should call notFound(), not redirect, on
// null, for the same enumeration-safe reason as everywhere else.
//
// Wrapped in React's cache() because both the layout (auth gate) and the
// page (needs workspace.name/description) call this with the same
// (slug, userId) during one request — cache() dedupes that to a single
// DB round trip instead of two, without the caller needing to know that.
export const resolveWorkspaceForRequest = cache(
  async (
    slug: string,
    userId: string,
  ): Promise<{ workspace: Workspace; membership: WorkspaceMember } | null> => {
    const workspace = await workspaceRepository.findBySlug(slug);
    if (!workspace) return null;

    const membership = await resolveWorkspaceMembership(workspace.id, userId);
    if (!membership) return null;

    return { workspace, membership };
  },
);
