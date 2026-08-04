import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AdminUserDetailResponse } from "@/features/admin/hooks/use-admin-user";
import type { UpdateAdminUserInput } from "@/features/admin/schemas/update-admin-user.schema";
import { apiClient } from "@/lib/api-client";

// Invalidates immediately on success, not staleTime-based — unlike
// issue edits (a high-frequency author action), this is an operator
// action on someone else's account that must be reflected right away
// (Milestone 6 proposal, Hook design). Invalidates both the specific
// user's detail query and the whole `admin-users` list prefix (every
// page/email-filter variant) so a role/isActive change is visible
// wherever that user appears, not just on the page the admin is on.
export function useUpdateAdminUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAdminUserInput) =>
      apiClient.patch<AdminUserDetailResponse>(`/api/admin/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
