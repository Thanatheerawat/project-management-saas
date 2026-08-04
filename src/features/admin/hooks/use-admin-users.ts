import { useQuery } from "@tanstack/react-query";

import type { PaginatedResponse } from "@/features/admin/hooks/use-admin-workspaces";
import type { PlatformRole } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";

export interface AdminUserListItemResponse {
  id: string;
  name: string | null;
  email: string;
  role: PlatformRole;
  isActive: boolean;
  lastLoginAt: string | null;
  workspaceCount: number;
}

// `email` is an optional case-insensitive substring filter, mirroring
// GET /api/admin/users' own `?email=` query param (Increment 3).
export function useAdminUsers(page: number, email?: string) {
  return useQuery({
    queryKey: ["admin-users", page, email],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (email) params.set("email", email);
      return apiClient.get<PaginatedResponse<AdminUserListItemResponse>>(
        `/api/admin/users?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });
}
