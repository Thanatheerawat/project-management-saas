import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LabelResponse } from "@/features/issue/hooks/use-labels";
import type { CreateLabelInput } from "@/features/issue/schemas/create-label.schema";
import { apiClient } from "@/lib/api-client";

export function useCreateLabel(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLabelInput) =>
      apiClient.post<LabelResponse>(`/api/workspaces/${workspaceId}/labels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });
}
