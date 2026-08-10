// Matches AiProviderType in prisma/schema.prisma and the AI_PROVIDER=
// mock|groq env var (src/config/env.ts). Kept as a plain string union here
// rather than imported from @/generated/prisma/client, since this type is
// also used by env.ts and the provider factory, which shouldn't need to
// depend on the generated Prisma client just for a two-value union.
export type AIProviderType = "mock" | "groq";

export type {
  AIBreakdownOutput,
  DraftTask,
} from "@/features/ai/schemas/ai-breakdown-output.schema";
