import { useQuery } from "@tanstack/react-query";

import type { SecurityActivityAction } from "@/constants/security-activity";
import { apiClient } from "@/lib/api-client";

export interface SecurityActivityEvent {
  id: string;
  action: SecurityActivityAction;
  occurredAt: string;
}

interface SecurityActivityResponse {
  events: SecurityActivityEvent[];
}

export function useSecurityActivity() {
  return useQuery({
    queryKey: ["security-activity", "me"],
    queryFn: () =>
      apiClient.get<SecurityActivityResponse>("/api/users/security-activity"),
  });
}
