import type { AIBreakdownOutput } from "@/features/ai/schemas/ai-breakdown-output.schema";

// Every AI provider (Mock, Groq, and any future addition) implements this
// one method. Swapping providers is purely AI_PROVIDER=mock|groq — see
// ai-provider-factory.ts — no other code needs to know which one is
// active. Implementations must always return output that already
// satisfies aiBreakdownOutputSchema; callers do not re-validate.
export interface AIProvider {
  generateBreakdown(prompt: string): Promise<AIBreakdownOutput>;
}
