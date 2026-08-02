import { useQuery } from "@tanstack/react-query";

import type { IssueResponse } from "@/features/issue/hooks/use-issues";
import { apiClient } from "@/lib/api-client";

export function useIssue(issueId: string) {
  return useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => apiClient.get<IssueResponse>(`/api/issues/${issueId}`),
  });
}
