import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CommentResponse } from "@/features/issue/hooks/use-comments";
import type { CreateCommentInput } from "@/features/issue/schemas/create-comment.schema";
import { apiClient } from "@/lib/api-client";

export function useCreateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentInput) =>
      apiClient.post<CommentResponse>(`/api/issues/${issueId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
    },
  });
}
