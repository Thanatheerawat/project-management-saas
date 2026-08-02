import { useQuery } from "@tanstack/react-query";

import type { LabelResponse } from "@/features/issue/hooks/use-labels";
import { apiClient } from "@/lib/api-client";

// A distinct query key ("issue-labels") from useLabels's "labels" — this
// is the subset of a workspace's label definitions attached to one
// specific issue, not the workspace's full label catalog. Reuses
// LabelResponse since the API returns the same shape either way.
export function useIssueLabels(issueId: string) {
  return useQuery({
    queryKey: ["issue-labels", issueId],
    queryFn: () => apiClient.get<LabelResponse[]>(`/api/issues/${issueId}/labels`),
  });
}
