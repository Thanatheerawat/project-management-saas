import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

// Shared shape — useProjectAnalyticsOverview imports this same interface
// rather than redeclaring it, since both endpoints return the identical
// contract (features/analytics/issue-breakdown-response.ts's
// toIssueBreakdownResponse), just scoped differently server-side.
export interface IssueBreakdownResponse {
  total: number;
  byStatus: Record<
    "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED",
    number
  >;
  byPriority: Record<"URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE", number>;
}

export function useWorkspaceAnalyticsOverview(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-analytics-overview", workspaceId],
    queryFn: () =>
      apiClient.get<IssueBreakdownResponse>(
        `/api/workspaces/${workspaceId}/analytics/overview`,
      ),
    enabled: Boolean(workspaceId),
    // A dashboard is a glance-and-leave surface, not one requiring
    // near-live freshness like the Kanban board's issue list — see the
    // Milestone 5 architecture proposal's Query Strategy.
    staleTime: 60_000,
  });
}
