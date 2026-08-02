import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export function useDeleteLabel(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelId: string) =>
      apiClient.delete<{ message: string }>(
        `/api/workspaces/${workspaceId}/labels/${labelId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });
}
