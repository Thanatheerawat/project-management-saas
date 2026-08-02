import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

// Same `projectId` reasoning as useAttachLabel — detaching a label also
// changes what `issue`/`issues` embed, so both must invalidate alongside
// `issue-labels`.
export function useDetachLabel(issueId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelId: string) =>
      apiClient.delete<{ message: string }>(`/api/issues/${issueId}/labels/${labelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-labels", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });
}
