import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LabelResponse } from "@/features/issue/hooks/use-labels";
import type { AttachLabelInput } from "@/features/issue/schemas/attach-label.schema";
import { apiClient } from "@/lib/api-client";

// Takes `projectId` alongside `issueId` for the same reason as
// useUpdateIssue: the attach POST only ever hits
// /api/issues/[issueId]/labels, but `issue` (single) and `issues` (board
// list) both embed `labels` directly on the Issue response (Increment 5B),
// so both caches need invalidating too — not just `issue-labels` — or the
// Kanban board and the detail page's own embedded copy go stale until
// staleTime elapses (Milestone 4 cleanup pass, see docs/session-log.md).
export function useAttachLabel(issueId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttachLabelInput) =>
      apiClient.post<LabelResponse>(`/api/issues/${issueId}/labels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-labels", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });
}
