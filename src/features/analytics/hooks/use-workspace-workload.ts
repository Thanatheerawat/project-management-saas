import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface WorkloadEntry {
  userId: string | null;
  name: string;
  count: number;
}

export interface WorkloadResponse {
  workload: WorkloadEntry[];
}

export function useWorkspaceWorkload(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-workload", workspaceId],
    queryFn: () =>
      apiClient.get<WorkloadResponse>(
        `/api/workspaces/${workspaceId}/analytics/workload`,
      ),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });
}
