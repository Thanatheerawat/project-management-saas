import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export function useDeleteIssue(issueId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete<{ message: string }>(`/api/issues/${issueId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });
}
