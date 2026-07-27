import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ProfileInput } from "@/features/user/schemas/profile.schema";
import { apiClient } from "@/lib/api-client";

interface UpdateProfileResponse {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProfileInput) =>
      apiClient.patch<UpdateProfileResponse>("/api/users/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    },
  });
}
