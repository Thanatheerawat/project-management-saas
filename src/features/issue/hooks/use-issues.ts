import { useQuery } from "@tanstack/react-query";

import type { LabelResponse } from "@/features/issue/hooks/use-labels";
import { apiClient } from "@/lib/api-client";

// `labels` is embedded (not fetched per card) so the board renders from
// one request — see toIssueResponse's comment for why, and the Milestone
// 4 Increment 5B decision in docs/session-log.md.
export interface IssueResponse {
  id: string;
  projectId: string;
  key: string;
  number: number;
  title: string;
  description: string | null;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  position: number;
  assigneeId: string | null;
  reporterId: string;
  labels: LabelResponse[];
  createdAt: string;
  updatedAt: string;
}

export function useIssues(projectId: string) {
  return useQuery({
    queryKey: ["issues", projectId],
    queryFn: () => apiClient.get<IssueResponse[]>(`/api/projects/${projectId}/issues`),
  });
}
