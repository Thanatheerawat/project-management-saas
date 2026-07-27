import { useMutation } from "@tanstack/react-query";

import type { VerifyEmailInput } from "@/features/auth/schemas/verify-email.schema";
import { apiClient } from "@/lib/api-client";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: VerifyEmailInput) =>
      apiClient.post<{ message: string }>("/api/auth/verify-email", data),
  });
}
