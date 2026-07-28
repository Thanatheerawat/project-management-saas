import type { Workspace, WorkspaceRole } from "@/generated/prisma/client";

// Used by every workspace route (list, create, detail, update) so all
// four return the exact same field set — before this, each handler
// hand-picked its own subset and they'd quietly drifted apart (e.g. only
// the detail route included createdAt).
export function toWorkspaceResponse(workspace: Workspace, role: WorkspaceRole) {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    role,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}
