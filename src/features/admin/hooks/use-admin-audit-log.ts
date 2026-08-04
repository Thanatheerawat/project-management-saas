import { useQuery } from "@tanstack/react-query";

import type { PaginatedResponse } from "@/features/admin/hooks/use-admin-workspaces";
import type { AuditAction } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";

export interface AuditLogEntryResponse {
  id: string;
  action: AuditAction;
  metadata: unknown;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

// `action` is an optional filter, mirroring GET /api/admin/audit-log's own
// `?action=` query param — the route itself treats an unrecognized value
// as no filter rather than a 400 (Increment 3), so this hook doesn't
// validate `action` client-side either.
export function useAdminAuditLog(page: number, action?: AuditAction) {
  return useQuery({
    queryKey: ["admin-audit-log", page, action],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (action) params.set("action", action);
      return apiClient.get<PaginatedResponse<AuditLogEntryResponse>>(
        `/api/admin/audit-log?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });
}
