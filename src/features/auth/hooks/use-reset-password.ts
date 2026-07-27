import { useMutation } from "@tanstack/react-query";

import type { ResetPasswordInput } from "@/features/auth/schemas/reset-password.schema";
import { apiClient } from "@/lib/api-client";

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) =>
      apiClient.post<{ message: string }>("/api/auth/reset-password", data),
  });
}
