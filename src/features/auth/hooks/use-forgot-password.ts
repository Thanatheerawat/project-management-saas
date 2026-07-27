import { useMutation } from "@tanstack/react-query";

import type { ForgotPasswordInput } from "@/features/auth/schemas/forgot-password.schema";
import { apiClient } from "@/lib/api-client";

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) =>
      apiClient.post<{ message: string }>("/api/auth/forgot-password", data),
  });
}
