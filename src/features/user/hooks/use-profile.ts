import { useQuery } from "@tanstack/react-query";

import type { PlatformRole } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";

export interface ProfileResponse {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: string | null;
  role: PlatformRole;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => apiClient.get<ProfileResponse>("/api/users/me"),
  });
}
