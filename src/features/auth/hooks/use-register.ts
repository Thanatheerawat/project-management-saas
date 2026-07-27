import { useMutation } from "@tanstack/react-query";

import type { RegisterInput } from "@/features/auth/schemas/register.schema";
import { apiClient } from "@/lib/api-client";

interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  mockVerifyUrl: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterInput) =>
      apiClient.post<RegisterResponse>("/api/auth/register", data),
  });
}
