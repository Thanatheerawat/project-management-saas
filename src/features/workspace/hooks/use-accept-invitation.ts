import { useMutation } from "@tanstack/react-query";

import type { AcceptInvitationInput } from "@/features/workspace/schemas/accept-invitation.schema";
import { apiClient } from "@/lib/api-client";

interface AcceptInvitationResponse {
  message: string;
  workspace: { id: string; slug: string; name: string };
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (data: AcceptInvitationInput) =>
      apiClient.post<AcceptInvitationResponse>("/api/invitations/accept", data),
  });
}
