import { useQuery } from "@tanstack/react-query";

import type { IssueBreakdownResponse } from "@/features/analytics/hooks/use-workspace-analytics-overview";
import { apiClient } from "@/lib/api-client";

// Platform-wide counts, ADMIN+. `issueOverview` reuses the same
// IssueBreakdownResponse shape as the workspace/project analytics hooks —
// GET /api/admin/overview feeds countByStatusGlobal/countByPriorityGlobal
// straight into the same toIssueBreakdownResponse mapper (Milestone 6
// Increment 2), so the client-side contract is identical too.
export interface AdminOverviewResponse {
  userCount: number;
  workspaceCount: number;
  projectCount: number;
  issueOverview: IssueBreakdownResponse;
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiClient.get<AdminOverviewResponse>("/api/admin/overview"),
    // 30s, not the analytics dashboard's 60s (Milestone 6 proposal, Query
    // Strategy) — an operator surface where an admin acting on stale data
    // (e.g. a just-deactivated user still showing active) is a worse
    // failure mode than the extra requests from a shorter staleTime.
    staleTime: 30_000,
  });
}
