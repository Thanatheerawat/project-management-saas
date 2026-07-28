import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceResponse } from "@/features/workspace/hooks/use-workspaces";
import type { UpdateWorkspaceInput } from "@/features/workspace/schemas/update-workspace.schema";
import { apiClient } from "@/lib/api-client";

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWorkspaceInput) =>
      apiClient.patch<WorkspaceResponse>(`/api/workspaces/${workspaceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
