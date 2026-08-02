import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LabelResponse } from "@/features/issue/hooks/use-labels";
import type { UpdateLabelInput } from "@/features/issue/schemas/update-label.schema";
import { apiClient } from "@/lib/api-client";

export function useUpdateLabel(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ labelId, data }: { labelId: string; data: UpdateLabelInput }) =>
      apiClient.patch<LabelResponse>(
        `/api/workspaces/${workspaceId}/labels/${labelId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });
}
