import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceMemberResponse } from "@/features/workspace/hooks/use-workspace-members";
import type { AddWorkspaceMemberInput } from "@/features/workspace/schemas/add-member.schema";
import { apiClient } from "@/lib/api-client";

export function useAddMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddWorkspaceMemberInput) =>
      apiClient.post<WorkspaceMemberResponse>(
        `/api/workspaces/${workspaceId}/members`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
    },
  });
}
