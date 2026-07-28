import type { Project } from "@/generated/prisma/client";

// Used by every project route (list, create, detail, update) — same
// motivation as toWorkspaceResponse: one shape, not four hand-picked ones.
export function toProjectResponse(project: Project) {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    status: project.status,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
