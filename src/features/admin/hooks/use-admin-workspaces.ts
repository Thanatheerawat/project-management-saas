import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

// Shared by every paginated admin list hook (use-admin-users,
// use-admin-audit-log import this same interface) — Decision Point B1
// (Milestone 6 proposal): plain offset/limit pagination, one response
// shape for all three list endpoints (`items`/`total`/`page`/`pageSize`,
// mirroring `parsePagination`'s server-side return shape).
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminWorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export function useAdminWorkspaces(page: number) {
  return useQuery({
    queryKey: ["admin-workspaces", page],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminWorkspaceResponse>>(
        `/api/admin/workspaces?page=${page}`,
      ),
    staleTime: 30_000,
  });
}
