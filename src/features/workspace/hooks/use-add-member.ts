import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceMemberResponse } from "@/features/workspace/hooks/use-workspace-members";
import type { AddWorkspaceMemberInput } from "@/features/workspace/schemas/add-member.schema";
import { apiClient } from "@/lib/api-client";

// Discriminated by `status`: "added" is an existing account (preserves
// the exact WorkspaceMemberResponse shape POST .../members already
// returned), "invited" is a brand-new WorkspaceInvitation — there is no
// membership yet, so there's no member id/user object to show, only
// confirmation of who was invited and when the invite expires.
export type AddMemberResult =
  | ({ status: "added" } & WorkspaceMemberResponse)
  | { status: "invited"; email: string; role: string; expiresAt: string };

// Calls POST .../invitations, not .../members — that route still exists
// and still works identically on its own (see its own file), but the UI's
// entry point is this single endpoint, which internally decides "add
// directly" vs. "invite" server-side rather than the client trying one
// then falling back to the other.
export function useAddMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddWorkspaceMemberInput) =>
      apiClient.post<AddMemberResult>(`/api/workspaces/${workspaceId}/invitations`, data),
    onSuccess: (result) => {
      if (result.status === "added") {
        queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      }
    },
  });
}
