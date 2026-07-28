import { useMutation } from "@tanstack/react-query";

import type { ProjectResponse } from "@/features/project/hooks/use-create-project";
import type { UpdateProjectInput } from "@/features/project/schemas/update-project.schema";
import { apiClient } from "@/lib/api-client";

// Same no-cache-invalidation reasoning as useCreateProject — the detail
// page re-reads via the repository after router.refresh().
export function useUpdateProject(projectId: string) {
  return useMutation({
    mutationFn: (data: UpdateProjectInput) =>
      apiClient.patch<ProjectResponse>(`/api/projects/${projectId}`, data),
  });
}
