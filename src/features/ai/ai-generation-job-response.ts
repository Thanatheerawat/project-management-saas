import type { DraftTask } from "@/features/ai/types";
import type { AiGenerationJob } from "@/generated/prisma/client";

// `tasks` is a separate parameter rather than a column on AiGenerationJob —
// the model deliberately doesn't store raw provider output (see the model
// comment in schema.prisma), so the only place the actual draft tasks
// exist is the in-memory provider result from this one request/response
// cycle.
export function toAiGenerationJobResponse(job: AiGenerationJob, tasks: DraftTask[]) {
  return {
    jobId: job.id,
    status: job.status,
    tasks,
  };
}
