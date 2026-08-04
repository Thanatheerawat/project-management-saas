import { useQuery } from "@tanstack/react-query";

import type { AdminWorkspaceResponse } from "@/features/admin/hooks/use-admin-workspaces";
import { apiClient } from "@/lib/api-client";

export function useAdminWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["admin-workspace", workspaceId],
    queryFn: () =>
      apiClient.get<AdminWorkspaceResponse>(`/api/admin/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}
