import { useQuery } from "@tanstack/react-query";

import type { IssueBreakdownResponse } from "@/features/analytics/hooks/use-workspace-analytics-overview";
import { apiClient } from "@/lib/api-client";

export function useProjectAnalyticsOverview(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-analytics-overview", projectId],
    queryFn: () =>
      apiClient.get<IssueBreakdownResponse>(
        `/api/projects/${projectId}/analytics/overview`,
      ),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}
