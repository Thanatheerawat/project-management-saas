import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { WorkspaceMemberResponse } from "@/features/workspace/hooks/use-workspace-members";
import type { UpdateWorkspaceMemberRoleInput } from "@/features/workspace/schemas/update-member-role.schema";
import { apiClient } from "@/lib/api-client";

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string;
      data: UpdateWorkspaceMemberRoleInput;
    }) =>
      apiClient.patch<WorkspaceMemberResponse>(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
    },
  });
}
