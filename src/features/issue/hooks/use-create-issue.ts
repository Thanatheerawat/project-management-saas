import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { IssueResponse } from "@/features/issue/hooks/use-issues";
import type { CreateIssueInput } from "@/features/issue/schemas/create-issue.schema";
import { apiClient } from "@/lib/api-client";

export function useCreateIssue(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIssueInput) =>
      apiClient.post<IssueResponse>(`/api/projects/${projectId}/issues`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });
}
