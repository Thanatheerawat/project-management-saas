import type { AiProviderType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// The only place `prisma.aiGenerationJob.*` is called from.
export const aiGenerationJobRepository = {
  // Inserted with the Prisma-default PENDING status before the provider
  // call is made — markSucceeded/markFailed below resolve it once the
  // call finishes. This means a row exists (and counts toward quota) for
  // every attempt, not just completed ones.
  create(data: {
    workspaceId: string;
    userId: string;
    provider: AiProviderType;
    prompt: string;
  }) {
    return prisma.aiGenerationJob.create({ data });
  },

  markSucceeded(id: string, taskCount: number) {
    return prisma.aiGenerationJob.update({
      where: { id },
      data: { status: "SUCCEEDED", taskCount, completedAt: new Date() },
    });
  },

  // errorMessage here is server-side audit data, not what the client sees
  // (the Route Handler returns a generic, safe message) — see the
  // AiGenerationJob model comment on why the raw provider response itself
  // is never stored.
  markFailed(id: string, errorMessage: string) {
    return prisma.aiGenerationJob.update({
      where: { id },
      data: { status: "FAILED", errorMessage, completedAt: new Date() },
    });
  },

  // Backs the daily quota check (M7 Increment 2): counts every attempt
  // (any status) for a workspace since a given point in time, reusing the
  // @@index([workspaceId, createdAt]) defined in Increment 1 specifically
  // for this query.
  countSince(workspaceId: string, since: Date) {
    return prisma.aiGenerationJob.count({
      where: { workspaceId, createdAt: { gte: since } },
    });
  },
};
