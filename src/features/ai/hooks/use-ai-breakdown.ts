import { useMutation } from "@tanstack/react-query";

import type { AIBreakdownRequest } from "@/features/ai/schemas/ai-breakdown-request.schema";
import type { DraftTask } from "@/features/ai/types";
import { apiClient } from "@/lib/api-client";

export interface AIBreakdownResult {
  jobId: string;
  status: string;
  tasks: DraftTask[];
}

// Same shape as useCreateIssue: a thin useMutation wrapper around
// apiClient.post, nothing else. No query cache to invalidate — the
// generated tasks aren't a persisted, queryable resource (AiGenerationJob
// deliberately never stores them, see ai-generation-job-response.ts's own
// comment), so they only ever live in this mutation's result and the
// calling component's own state.
export function useAIBreakdown(workspaceId: string) {
  return useMutation({
    mutationFn: (data: AIBreakdownRequest) =>
      apiClient.post<AIBreakdownResult>(
        `/api/workspaces/${workspaceId}/ai/breakdown`,
        data,
      ),
  });
}
