import type { User, Workspace, WorkspaceMember } from "@/generated/prisma/client";

type WorkspaceWithAdminIncludes = Workspace & {
  _count: { members: number; projects: number };
  members: (WorkspaceMember & { user: User })[];
};

// Used by both the admin workspace list and detail endpoints — one
// shape for both, since the admin dashboard is read-only for workspaces
// this milestone (Decision D1), so there's no separate detail-only field
// to justify a second function. `members` arrives from the repository
// (workspaceRepository.findManyForAdmin/findByIdForAdmin) already
// filtered to the OWNER row, so `[0]` is the owner — falls back to null
// defensively even though "exactly one OWNER per workspace" (enforced
// at creation, Milestone 3) means this should never actually be empty.
export function toAdminWorkspaceResponse(workspace: WorkspaceWithAdminIncludes) {
  const owner = workspace.members[0]?.user ?? null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
    memberCount: workspace._count.members,
    projectCount: workspace._count.projects,
    createdAt: workspace.createdAt,
  };
}
