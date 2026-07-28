import { useQuery } from "@tanstack/react-query";

import type { WorkspaceRole } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";

export interface WorkspaceMemberResponse {
  id: string;
  role: WorkspaceRole;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () =>
      apiClient.get<WorkspaceMemberResponse[]>(`/api/workspaces/${workspaceId}/members`),
  });
}
