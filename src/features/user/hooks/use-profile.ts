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
  jobTitle: string | null;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  website: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => apiClient.get<ProfileResponse>("/api/users/me"),
  });
}
