import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CommentResponse } from "@/features/issue/hooks/use-comments";
import type { CreateCommentInput } from "@/features/issue/schemas/create-comment.schema";
import { apiClient } from "@/lib/api-client";

// The route is flat (`/api/comments/[commentId]`, no issueId in the URL —
// see Increment 4), so `issueId` here exists purely to invalidate the
// right comment-list query, same reasoning as useUpdateIssue's projectId
// parameter. Reuses CreateCommentInput for the payload type, same as the
// route itself reuses createCommentSchema (a comment has one editable
// field with no distinct partial-update shape — see
// create-comment.schema.ts).
export function useUpdateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: CreateCommentInput }) =>
      apiClient.patch<CommentResponse>(`/api/comments/${commentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
    },
  });
}
