import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { IssueResponse } from "@/features/issue/hooks/use-issues";
import type { UpdateIssueInput } from "@/features/issue/schemas/update-issue.schema";
import { apiClient } from "@/lib/api-client";

// Takes `projectId` alongside `issueId` (not derivable from the update
// response alone without an extra render) purely to invalidate the board
// list query — the PATCH request itself only ever hits /api/issues/[issueId].
export function useUpdateIssue(issueId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateIssueInput) =>
      apiClient.patch<IssueResponse>(`/api/issues/${issueId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });
}
