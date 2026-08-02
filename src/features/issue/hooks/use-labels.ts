import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface LabelResponse {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
}

export function useLabels(workspaceId: string) {
  return useQuery({
    queryKey: ["labels", workspaceId],
    queryFn: () =>
      apiClient.get<LabelResponse[]>(`/api/workspaces/${workspaceId}/labels`),
  });
}
