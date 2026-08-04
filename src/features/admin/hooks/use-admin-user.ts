import { useQuery } from "@tanstack/react-query";

import type { PlatformRole, WorkspaceRole } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";

// Same account fields as AdminUserListItemResponse plus the actual
// workspaces this user belongs to — mirrors toAdminUserDetailResponse
// (features/admin/admin-user-response.ts) exactly. Also the return type
// of useUpdateAdminUser's mutation, since PATCH /api/admin/users/[userId]
// responds with the detail shape, not the list-item shape.
export interface AdminUserDetailResponse {
  id: string;
  name: string | null;
  email: string;
  role: PlatformRole;
  isActive: boolean;
  lastLoginAt: string | null;
  workspaces: { id: string; name: string; slug: string; role: WorkspaceRole }[];
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => apiClient.get<AdminUserDetailResponse>(`/api/admin/users/${userId}`),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
