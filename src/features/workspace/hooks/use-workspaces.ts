import { useQuery } from "@tanstack/react-query";

import type { WorkspaceRole } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiClient.get<WorkspaceResponse[]>("/api/workspaces"),
  });
}
