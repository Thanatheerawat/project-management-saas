import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface AdminHealthResponse {
  database: { reachable: boolean; latencyMs: number };
}

// The first polling hook in the app (Milestone 6 proposal, Query
// Strategy) — every other query relies on staleTime/manual invalidation
// only. `refetchInterval` keeps the health panel current without the
// admin needing to leave and return to the page; `staleTime` shorter than
// the interval so a mount between ticks still triggers its own fetch
// instead of showing a slightly-stale cached value.
export function useAdminHealth() {
  return useQuery({
    queryKey: ["admin-health"],
    queryFn: () => apiClient.get<AdminHealthResponse>("/api/admin/health"),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
