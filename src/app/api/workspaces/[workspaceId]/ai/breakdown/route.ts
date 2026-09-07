import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { toAiGenerationJobResponse } from "@/features/ai/ai-generation-job-response";
import { aiBreakdownRequestSchema } from "@/features/ai/schemas/ai-breakdown-request.schema";
import type { AiProviderType } from "@/generated/prisma/client";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { logger } from "@/lib/logger";
import { aiGenerationJobRepository } from "@/repositories/ai/ai-generation-job.repository";
import { createAIProvider } from "@/services/ai/ai-provider-factory";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

// M7 Increment 2 decision: 10 AI generations per workspace per day, reset
// at the start of the current calendar day (server time). A named
// constant so a future increment can change the number (or make it
// per-plan/configurable) without touching the route logic below. Counts
// every attempt regardless of outcome (PENDING/SUCCEEDED/FAILED alike) —
// see aiGenerationJobRepository.countSince — so a failing provider can't
// be used to retry past the limit for free.
export const AI_DAILY_QUOTA_PER_WORKSPACE = 10;

type RouteContext = { params: Promise<{ workspaceId: string }> };

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Any workspace Member may generate an AI breakdown (M7 Increment 2
// decision) — the same floor as issue creation (Decision Point G), not a
// new permission tier. requireWorkspaceAccess(..., "MEMBER") returns null
// for both a nonexistent workspace and one the caller isn't a member of,
// so both cases 404 identically (same enumeration-safe pattern as every
// other workspace-scoped route).
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { workspaceId } = await params;
    const membership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "MEMBER",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const body = await request.json();
    const data = aiBreakdownRequestSchema.parse(body);

    const attemptsToday = await aiGenerationJobRepository.countSince(
      workspaceId,
      startOfToday(),
    );
    if (attemptsToday >= AI_DAILY_QUOTA_PER_WORKSPACE) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `This workspace has reached its daily limit of ${AI_DAILY_QUOTA_PER_WORKSPACE} AI generations`,
        },
        { status: 429 },
      );
    }

    // Prisma's AiProviderType enum is uppercase (MOCK/GROQ); the
    // app-level AIProviderType union that env.AI_PROVIDER and the factory
    // use is lowercase — see features/ai/types.ts for why they're kept as
    // two separate types instead of one.
    const job = await aiGenerationJobRepository.create({
      workspaceId,
      userId: session.user.id,
      provider: env.AI_PROVIDER.toUpperCase() as AiProviderType,
      prompt: data.prompt,
    });

    try {
      const provider = createAIProvider(env.AI_PROVIDER, {
        groqApiKey: env.GROQ_API_KEY,
      });
      const result = await provider.generateBreakdown(data.prompt);

      const completed = await aiGenerationJobRepository.markSucceeded(
        job.id,
        result.tasks.length,
      );

      return NextResponse.json(toAiGenerationJobResponse(completed, result.tasks), {
        status: 201,
      });
    } catch (providerError) {
      const message =
        providerError instanceof Error ? providerError.message : "Unknown provider error";

      logger.error("AI provider generation failed", { jobId: job.id, message });
      await aiGenerationJobRepository.markFailed(job.id, message);

      // Generic client-facing message on purpose — the caught error may
      // contain provider-internal detail that shouldn't leave the server;
      // the full message is only persisted server-side (above) and logged.
      return NextResponse.json(
        {
          error: "ai_generation_failed",
          message: "AI generation failed. Please try again.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
