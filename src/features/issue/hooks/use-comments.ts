import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface CommentResponse {
  id: string;
  issueId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function useComments(issueId: string) {
  return useQuery({
    queryKey: ["comments", issueId],
    queryFn: () => apiClient.get<CommentResponse[]>(`/api/issues/${issueId}/comments`),
  });
}
