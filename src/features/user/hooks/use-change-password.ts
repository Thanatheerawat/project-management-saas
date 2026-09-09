import { useMutation } from "@tanstack/react-query";

import type { ChangePasswordInput } from "@/features/user/schemas/change-password.schema";
import { apiClient } from "@/lib/api-client";

// No cache invalidation on success — the password isn't part of any
// TanStack Query cache entry (useProfile never fetches it), unlike
// useUpdateProfile which invalidates ["profile", "me"].
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiClient.post<{ message: string }>("/api/users/password", data),
  });
}
