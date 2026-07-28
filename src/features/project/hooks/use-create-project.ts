import { useMutation } from "@tanstack/react-query";

import type { CreateProjectInput } from "@/features/project/schemas/create-project.schema";
import { apiClient } from "@/lib/api-client";

export interface ProjectResponse {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// No query-cache invalidation here: the project list/detail pages are
// Server Components reading straight from projectRepository (same pattern
// as the workspace dashboard shell), not a TanStack Query cache — the
// caller does router.refresh() after a successful mutation instead (see
// CreateProjectForm), the same way CreateWorkspaceForm does.
export function useCreateProject(workspaceId: string) {
  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      apiClient.post<ProjectResponse>(`/api/workspaces/${workspaceId}/projects`, data),
  });
}
