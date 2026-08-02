import { cache } from "react";

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { requireWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";
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

// Resolves an issue to its parent project and the caller's workspace
// membership in one call — same "resolve child, derive parent, check
// membership" shape as resolveCommentContext (comments/[commentId]/route.ts),
// promoted to a shared helper because the issue -> project -> membership
// chain was previously duplicated across every issue-scoped route (detail/
// update/delete, label attach/detach, comment list/create) — Milestone 4
// cleanup pass, see docs/session-log.md. Returns null on any broken link
// (issue missing, its project missing, or caller not a workspace member) —
// callers should treat that as 404, same enumeration-safe pattern as
// everywhere else in this codebase.
export async function resolveIssueContext(issueId: string, userId: string) {
  const issue = await issueRepository.findById(issueId);
  if (!issue) return null;

  const project = await projectRepository.findById(issue.projectId);
  if (!project) return null;

  const membership = await resolveWorkspaceMembership(project.workspaceId, userId);
  if (!membership) return null;

  return { issue, project, membership };
}

// Backs the "assignee must be a workspace member" check shared by issue
// create (POST /api/projects/[projectId]/issues) and update
// (PATCH /api/issues/[issueId]) — no FK can express this cross-table
// constraint (Milestone 4 Architecture Review, Risk 5), so both routes used
// to enforce it with an identical inline block; this is that block,
// extracted. Returns true when there's nothing to validate (assigneeId is
// null/undefined) so callers can write `if (!(await validateAssignee(...)))`
// without a separate falsy check first.
export async function validateAssignee(
  workspaceId: string,
  assigneeId: string | null | undefined,
): Promise<boolean> {
  if (!assigneeId) return true;
  const membership = await resolveWorkspaceMembership(workspaceId, assigneeId);
  return membership !== null;
}
