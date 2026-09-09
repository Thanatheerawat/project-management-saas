import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

// No request body — the authenticated-only /api/auth/resend-verification
// route derives the user from the session (see that route's own comment
// for why there's no unauthenticated variant).
export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>("/api/auth/resend-verification", {}),
  });
}
