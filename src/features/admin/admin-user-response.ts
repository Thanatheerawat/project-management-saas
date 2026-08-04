import type { User, Workspace, WorkspaceMember } from "@/generated/prisma/client";

// Used by the admin user list endpoint. Never spreads the full User
// row (keeps passwordHash from ever reaching a client) — same
// discipline as toWorkspaceMemberResponse/toCommentResponse.
export function toAdminUserListItemResponse(
  user: User & { _count: { workspaceMemberships: number } },
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    workspaceCount: user._count.workspaceMemberships,
  };
}

// Used by the admin user-detail endpoint — same account fields as the
// list item, plus the actual workspaces this user belongs to (a
// platform admin needs "what is this person a member of," not just
// their own account fields).
export function toAdminUserDetailResponse(
  user: User & {
    workspaceMemberships: (WorkspaceMember & { workspace: Workspace })[];
  },
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    workspaces: user.workspaceMemberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
    })),
  };
}
