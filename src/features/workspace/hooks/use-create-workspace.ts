import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceResponse } from "@/features/workspace/hooks/use-workspaces";
import type { CreateWorkspaceInput } from "@/features/workspace/schemas/create-workspace.schema";
import { apiClient } from "@/lib/api-client";

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) =>
      apiClient.post<WorkspaceResponse>("/api/workspaces", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
